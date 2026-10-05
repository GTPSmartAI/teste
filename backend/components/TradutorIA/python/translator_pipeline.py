"""
Pipeline de Tradução Automática de Mangás/Manhwas (Mangaflix Prime)
- Extração de texto de balões via OCR (Tesseract / Pytesseract), agrupando palavras por parágrafo
- Tradução Inglês -> Português do Brasil (PT-BR) com glossário de Manhwas
- Renderização do texto traduzido no lugar do original e upload para o MinIO
- Reaproveita páginas já traduzidas (não refaz o trabalho a cada clique)
"""

import io
import json
import re
import threading
import time
import urllib.request
from typing import Dict, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont, ImageOps

# Importar módulos do sistema
from minio_storage import get_minio_client, build_public_url, MINIO_BUCKET
from database import get_connection

# Dicionário Canônico de Solo Leveling / Manhwas (Consistência na tradução)
GLOSSARY_RULES = {
    r"\bShadow Monarch\b": "Monarca das Sombras",
    r"\bShadow Soldiers\b": "Soldados das Sombras",
    r"\bHunter Association\b": "Associação de Caçadores",
    r"\bHunter\b": "Caçador",
    r"\bHunters\b": "Caçadores",
    r"\bDungeon\b": "Masmorra",
    r"\bDungeons\b": "Masmorras",
    r"\bGate\b": "Portal",
    r"\bGates\b": "Portais",
    r"\bAwakening\b": "Despertar",
    r"\bAwakened\b": "Desperto",
    r"\bE-Rank\b": "Rank E",
    r"\bS-Rank\b": "Rank S",
    r"\bMagic Beast\b": "Besta Mágica",
    r"\bMagic Beasts\b": "Bestas Mágicas",
    r"\bMana\b": "Mana",
    r"\bQuest\b": "Missão",
    r"\bLevel Up\b": "Subir de Nível",
    r"\bArise\b": "Erga-se",
    r"\bDaily Quest\b": "Missão Diária",
}

# Termos mais longos primeiro: senão "Quest" vira "Missão" antes de "Daily Quest" ser reconhecido
_GLOSSARY_ORDERED = sorted(GLOSSARY_RULES.items(), key=lambda kv: len(kv[0]), reverse=True)

# Google Translate aceita ~5000 caracteres por requisição
_MAX_CHARS_PER_REQUEST = 4500
# Confiança mínima do Tesseract por palavra e média mínima por balão
_MIN_WORD_CONF = 40
_MIN_BLOCK_CONF = 55
# Abaixo dessa largura a página é ampliada antes do OCR (letras de balão ficam pequenas demais)
_OCR_UPSCALE_BELOW_WIDTH = 1200
# Limite de altura do Tesseract / Pillow para tiras longas de manhwa
_OCR_MAX_HEIGHT = 30000

_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Docker (fonts-dejavu-core)
    "C:/Windows/Fonts/arialbd.ttf",                           # testes locais no Windows
    "DejaVuSans-Bold.ttf",
]

_TRANSLATION_CACHE: Dict[str, str] = {}

# Um capítulo só é traduzido por uma requisição de cada vez
_CHAPTER_LOCKS: Dict[Tuple[str, int], threading.Lock] = {}
_CHAPTER_LOCKS_GUARD = threading.Lock()


def apply_glossary(text: str) -> str:
    """Aplica o vocabulário canônico da obra (termos em inglês -> PT-BR)."""
    for pattern, replacement in _GLOSSARY_ORDERED:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def _prepare_source(text: str) -> str:
    """Balões costumam vir em CAIXA ALTA, o que piora a tradução. Normaliza e aplica o glossário."""
    clean = re.sub(r"\s+", " ", text).strip()
    # Hifenização de quebra de linha do balão: "SOME- THING" -> "SOMETHING"
    clean = re.sub(r"(\w)- (\w)", r"\1\2", clean)
    if clean.isupper():
        clean = clean.lower()
        clean = re.sub(r"(^|[.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), clean)
        clean = re.sub(r"\bi\b", "I", clean)
    return apply_glossary(clean)


def _google_translate(text: str) -> str:
    from deep_translator import GoogleTranslator
    return GoogleTranslator(source="en", target="pt").translate(text) or ""


def translate_batch_pt(texts: List[str]) -> List[str]:
    """
    Traduz vários balões em poucas requisições (um balão por linha) e guarda em cache.
    Se a tradução falhar, devolve o texto original sem gravar no cache (tenta de novo na próxima vez).
    """
    results: List[Optional[str]] = []
    pending: List[Tuple[int, str]] = []

    for idx, t in enumerate(texts):
        clean = _prepare_source(t)
        if len(clean) < 2:
            results.append("")
        elif clean in _TRANSLATION_CACHE:
            results.append(_TRANSLATION_CACHE[clean])
        else:
            results.append(None)
            pending.append((idx, clean))

    # Agrupa os balões pendentes em lotes de até _MAX_CHARS_PER_REQUEST caracteres
    chunks: List[List[Tuple[int, str]]] = []
    current: List[Tuple[int, str]] = []
    size = 0
    for item in pending:
        if current and size + len(item[1]) + 1 > _MAX_CHARS_PER_REQUEST:
            chunks.append(current)
            current, size = [], 0
        current.append(item)
        size += len(item[1]) + 1
    if current:
        chunks.append(current)

    for chunk in chunks:
        translated: Optional[List[str]] = None
        try:
            time.sleep(0.2)  # Pequeno espaçamento anti rate-limit
            joined = _google_translate("\n".join(src for _, src in chunk))
            lines = [ln.strip() for ln in joined.split("\n")]
            if len(lines) == len(chunk):
                translated = lines
        except Exception as e:
            print(f"[Aviso Tradutor Lote] {e}")

        if translated is None:
            # O Google juntou/separou linhas ou falhou: traduz balão por balão
            translated = []
            for _, src in chunk:
                try:
                    time.sleep(0.2)
                    translated.append(_google_translate(src).strip())
                except Exception as e:
                    print(f"[Aviso Tradutor] {e}")
                    translated.append("")

        for (res_idx, src), pt in zip(chunk, translated):
            if pt:
                pt = apply_glossary(pt)
                _TRANSLATION_CACHE[src] = pt
                results[res_idx] = pt
            else:
                results[res_idx] = src

    return [r or "" for r in results]


def translate_text_pt(text: str) -> str:
    """Traduz texto individual usando o cache do lote."""
    res = translate_batch_pt([text])
    return res[0] if res else ""


def extract_text_boxes_from_image(image_bytes: bytes) -> List[Dict]:
    """
    Executa OCR na imagem e agrupa as palavras por parágrafo (cada balão de fala).
    Retorna lista de {text, x, y, w, h, conf} em coordenadas da imagem original.
    """
    try:
        import pytesseract
        from pytesseract import Output
    except ImportError:
        print("[ERRO] pytesseract não instalado.")
        return []

    with Image.open(io.BytesIO(image_bytes)) as img:
        gray = ImageOps.autocontrast(img.convert("L"))

    scale = 1.0
    if gray.width < _OCR_UPSCALE_BELOW_WIDTH and gray.height * 2 <= _OCR_MAX_HEIGHT:
        scale = 2.0
        gray = gray.resize((gray.width * 2, gray.height * 2), Image.LANCZOS)

    # psm 11: texto esparso (balões espalhados pela página, sem layout de documento)
    data = pytesseract.image_to_data(gray, lang="eng", config="--psm 11", output_type=Output.DICT)

    groups: Dict[Tuple[int, int], List[int]] = {}
    for i, raw in enumerate(data["text"]):
        word = (raw or "").strip()
        if not word:
            continue
        # O pytesseract devolve a confiança como número ou texto ("96.5", "-1") conforme a versão
        try:
            conf = float(data["conf"][i])
        except (TypeError, ValueError):
            conf = 0.0
        if conf < _MIN_WORD_CONF or not re.search(r"[A-Za-z]", word):
            continue
        key = (data["block_num"][i], data["par_num"][i])
        groups.setdefault(key, []).append(i)

    boxes = []
    for idxs in groups.values():
        words = [data["text"][i].strip() for i in idxs]
        text = " ".join(words)
        letters = sum(c.isalpha() for c in text)
        if letters < 2:
            continue
        avg_conf = sum(float(data["conf"][i]) for i in idxs) / len(idxs)
        if avg_conf < _MIN_BLOCK_CONF:
            continue
        x1 = min(data["left"][i] for i in idxs)
        y1 = min(data["top"][i] for i in idxs)
        x2 = max(data["left"][i] + data["width"][i] for i in idxs)
        y2 = max(data["top"][i] + data["height"][i] for i in idxs)
        line_h = sorted(data["height"][i] for i in idxs)[len(idxs) // 2]
        boxes.append({
            "text": text,
            "x": int(x1 / scale),
            "y": int(y1 / scale),
            "w": int((x2 - x1) / scale),
            "h": int((y2 - y1) / scale),
            "line_h": max(8, int(line_h / scale)),
            "conf": int(avg_conf),
        })

    boxes.sort(key=lambda b: (b["y"], b["x"]))
    return boxes


def _load_font(size: int):
    for path in _FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    # Pillow >= 10.1 tem uma fonte TrueType embutida com acentos
    return ImageFont.load_default(size=size)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> List[str]:
    lines: List[str] = []
    line = ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if not line or draw.textlength(candidate, font=font) <= max_w:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def _fit_text(draw: ImageDraw.ImageDraw, text: str, box_w: int, box_h: int, start_size: int):
    """Maior fonte (até start_size) em que o texto quebrado cabe na caixa do balão."""
    for size in range(start_size, 7, -1):
        font = _load_font(size)
        lines = _wrap(draw, text, font, box_w)
        line_h = int(size * 1.15)
        widest = max((draw.textlength(ln, font=font) for ln in lines), default=0)
        if line_h * len(lines) <= box_h and widest <= box_w:
            return font, lines, line_h
    font = _load_font(8)
    return font, _wrap(draw, text, font, box_w), 9


def render_translated_image(image_bytes: bytes, translated_blocks: List[Dict]) -> bytes:
    """
    Apaga o texto original de cada balão e escreve a tradução centralizada no mesmo espaço.
    """
    with Image.open(io.BytesIO(image_bytes)) as src:
        img = src.convert("RGB")
    draw = ImageDraw.Draw(img)

    for b in translated_blocks:
        pt_text = (b.get("translated") or "").strip()
        if not pt_text:
            continue
        if b["text"].isupper():
            pt_text = pt_text.upper()

        # PT-BR costuma ser ~20% mais longo: aproveita um pouco de margem ao redor do texto original
        pad = max(4, b["line_h"] // 3)
        x1 = max(0, b["x"] - pad)
        y1 = max(0, b["y"] - pad)
        x2 = min(img.width, b["x"] + b["w"] + pad)
        y2 = min(img.height, b["y"] + b["h"] + pad)
        draw.rectangle([x1, y1, x2, y2], fill=(255, 255, 255))

        inner_w = max(10, x2 - x1 - 4)
        inner_h = max(10, y2 - y1 - 4)
        font, lines, line_h = _fit_text(draw, pt_text, inner_w, inner_h, start_size=max(10, int(b["line_h"] * 1.1)))

        total_h = line_h * len(lines)
        ty = y1 + (y2 - y1 - total_h) // 2
        cx = (x1 + x2) / 2
        for ln in lines:
            tw = draw.textlength(ln, font=font)
            draw.text((cx - tw / 2, ty), ln, fill=(10, 10, 10), font=font)
            ty += line_h

    output = io.BytesIO()
    img.save(output, format="WEBP", quality=85, method=4)
    return output.getvalue()


def _translated_object(manga_id: str, chapter_number: int, page_idx: int) -> str:
    return f"capitulos_traduzidos/{manga_id}/cap_{chapter_number}/p_{page_idx:03d}.webp"


def _load_chapter_pages(manga_id: str, chapter_number: int) -> List[str]:
    conn = get_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT pages_json FROM aaa.capitulos WHERE manga_id=%s AND chapter_number=%s",
                (manga_id, chapter_number),
            )
            row = cur.fetchone()
    finally:
        conn.close()
    if not row:
        return []
    pages = json.loads(row["pages_json"]) if isinstance(row["pages_json"], str) else row["pages_json"]
    return pages if isinstance(pages, list) else []


def _existing_translated_indexes(client, manga_id: str, chapter_number: int) -> set:
    """Índices (1-based) das páginas que já têm versão traduzida no MinIO."""
    found = set()
    if not client:
        return found
    prefix = f"capitulos_traduzidos/{manga_id}/cap_{chapter_number}/"
    try:
        for obj in client.list_objects(MINIO_BUCKET, prefix=prefix, recursive=True):
            m = re.search(r"/p_(\d+)\.webp$", obj.object_name)
            if m:
                found.add(int(m.group(1)))
    except Exception as e:
        print(f"[Aviso] Falha ao listar tradução {prefix}: {e}")
    return found


def get_translated_pages(manga_id: str, chapter_number: int) -> Dict:
    """
    Capítulo completo para o leitor: página traduzida quando existir, original nas demais
    (mantém a ordem e o total de páginas mesmo se só parte foi traduzida).
    """
    pages_urls = _load_chapter_pages(manga_id, chapter_number)
    done = _existing_translated_indexes(get_minio_client(), manga_id, chapter_number)
    merged = [
        build_public_url(_translated_object(manga_id, chapter_number, i)) if i in done else url
        for i, url in enumerate(pages_urls, start=1)
    ]
    translated_count = sum(1 for i in range(1, len(pages_urls) + 1) if i in done)
    return {
        "manga_id": manga_id,
        "chapter_number": chapter_number,
        "translated": translated_count > 0,
        "total_translated": translated_count,
        "total_pages": len(pages_urls),
        "pages": merged if translated_count else [],
    }


def _chapter_lock(manga_id: str, chapter_number: int) -> threading.Lock:
    with _CHAPTER_LOCKS_GUARD:
        return _CHAPTER_LOCKS.setdefault((manga_id, chapter_number), threading.Lock())


def translate_chapter(manga_id: str, chapter_number: int, max_pages: int = 10, force: bool = False) -> Dict:
    """
    Processa a tradução do capítulo:
    1. Busca URLs das páginas na base 'aaa.capitulos'
    2. Para cada página ainda não traduzida (até max_pages), faz OCR e traduz os balões
    3. Renderiza a versão traduzida e faz upload no MinIO em 'capitulos_traduzidos/'
    """
    lock = _chapter_lock(manga_id, chapter_number)
    if not lock.acquire(blocking=False):
        return {"success": False, "error": "Este capítulo já está sendo traduzido. Aguarde alguns instantes."}
    try:
        return _translate_chapter(manga_id, chapter_number, max_pages, force)
    finally:
        lock.release()


def _translate_chapter(manga_id: str, chapter_number: int, max_pages: int, force: bool) -> Dict:
    print(f"\n[TRADUÇÃO IA] Iniciando tradução de '{manga_id}' Cap {chapter_number}...")

    pages_urls = _load_chapter_pages(manga_id, chapter_number)
    if not pages_urls:
        return {"success": False, "error": "Capítulo não encontrado ou sem páginas"}

    client = get_minio_client()
    if not client:
        return {"success": False, "error": "Armazenamento indisponível para salvar a tradução"}

    done = set() if force else _existing_translated_indexes(client, manga_id, chapter_number)
    limit = min(max_pages, len(pages_urls))
    todo = [i for i in range(1, limit + 1) if i not in done]
    newly_translated = 0

    for idx in todo:
        page_url = pages_urls[idx - 1]
        try:
            print(f"  Traduzindo pág {idx:02d}/{limit:02d} ({page_url})...")
            req = urllib.request.Request(page_url, headers={"User-Agent": "MangaflixApp/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                page_raw = resp.read()

            # 1. OCR (um bloco por balão)
            boxes = extract_text_boxes_from_image(page_raw)
            print(f"    -> {len(boxes)} balões detectados")

            # 2. Tradução de todos os balões da página em lote
            translations = translate_batch_pt([b["text"] for b in boxes])
            for b, pt in zip(boxes, translations):
                b["translated"] = pt

            # 3. Renderizar nova página WebP com texto em PT-BR (sem balões = cópia da original)
            translated_webp = render_translated_image(page_raw, boxes)

            # 4. Upload para MinIO
            obj_name = _translated_object(manga_id, chapter_number, idx)
            client.put_object(
                bucket_name=MINIO_BUCKET,
                object_name=obj_name,
                data=io.BytesIO(translated_webp),
                length=len(translated_webp),
                content_type="image/webp",
            )
            done.add(idx)
            newly_translated += 1
            print(f"    ✓ Página {idx} traduzida")
        except Exception as ep:
            # A página fica com a versão original no leitor
            print(f"    ✗ Erro na página {idx}: {ep}")

    result = get_translated_pages(manga_id, chapter_number)
    if not result["translated"]:
        return {"success": False, "error": "Nenhuma página pôde ser traduzida"}
    result.update({
        "success": True,
        "translated_count": result["total_translated"],
        "newly_translated": newly_translated,
        "failed_pages": len(todo) - newly_translated,
    })
    return result
