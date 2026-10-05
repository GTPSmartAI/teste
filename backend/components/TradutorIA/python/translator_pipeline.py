"""
Pipeline de Tradução Automática de Mangás/Manhwas (Mangaflix Prime)
- Extração de texto de balões via OCR (Tesseract / Pytesseract)
- Tradução neural de Inglês -> Português do Brasil (PT-BR) com glossário de Manhwas
- Renderização limpa de texto em balões e upload para o MinIO
- Suporte a cache e overlay de texto
"""

import os
import io
import re
import json
import urllib.request
from typing import List, Dict, Tuple, Optional
from PIL import Image, ImageDraw, ImageFont

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

def apply_glossary(text: str) -> str:
    """Aplica o vocabulário canônico da obra sobre o texto traduzido."""
    for pattern, replacement in GLOSSARY_RULES.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text

_TRANSLATION_CACHE = {}

def translate_batch_pt(texts: List[str]) -> List[str]:
    """Traduz múltiplos blocos de texto em lote com translate_batch e cache."""
    if not texts:
        return []
    
    results = []
    to_translate = []
    indices_to_translate = []

    for idx, t in enumerate(texts):
        clean = t.strip()
        if not clean or len(clean) < 2:
            results.append("")
        elif clean in _TRANSLATION_CACHE:
            results.append(_TRANSLATION_CACHE[clean])
        else:
            results.append(None) # placeholder
            to_translate.append(clean)
            indices_to_translate.append(idx)

    if to_translate:
        try:
            from deep_translator import GoogleTranslator
            import time
            time.sleep(0.15) # Pequeno espaçamento anti rate-limit
            # Traduz em lote (batch) de até 25 frases por requisição
            translated_list = GoogleTranslator(source='en', target='pt').translate_batch(to_translate)
            for orig, trans, res_idx in zip(to_translate, translated_list, indices_to_translate):
                pt_text = apply_glossary(trans if trans else orig)
                _TRANSLATION_CACHE[orig] = pt_text
                results[res_idx] = pt_text
        except Exception as e:
            print(f"[Aviso Tradutor Batch] {e}")
            for orig, res_idx in zip(to_translate, indices_to_translate):
                pt_text = apply_glossary(orig)
                _TRANSLATION_CACHE[orig] = pt_text
                results[res_idx] = pt_text

    return [r if r is not None else "" for r in results]

def translate_text_pt(text: str) -> str:
    """Traduz texto individual usando o batch cache."""
    res = translate_batch_pt([text])
    return res[0] if res else ""

def extract_text_boxes_from_image(image_bytes: bytes) -> List[Dict]:
    """
    Executa OCR na imagem e detecta blocos de texto (balões de fala).
    Retorna lista de {text, left, top, width, height, confidence}.
    """
    try:
        import pytesseract
        from pytesseract import Output
    except ImportError:
        print("[ERRO] pytesseract não instalado.")
        return []

    with Image.open(io.BytesIO(image_bytes)) as img:
        # Converter para escala de cinza para melhor contraste OCR
        gray = img.convert("L")
        
        # Obter dados de OCR detalhados
        data = pytesseract.image_to_data(gray, lang="eng", output_type=Output.DICT)
        
        boxes = []
        n_boxes = len(data['text'])
        
        # Agrupar palavras em blocos de parágrafos/balões
        current_block = []
        last_block_num = None
        
        for i in range(n_boxes):
            text = data['text'][i].strip()
            # O pytesseract devolve a confiança como número ou texto ("96.5", "-1") conforme a versão
            try:
                conf = int(float(data['conf'][i]))
            except (TypeError, ValueError):
                conf = 0
            
            if conf > 35 and len(text) > 1 and re.search(r'[A-Za-z]', text):
                block_num = data['block_num'][i]
                x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                
                boxes.append({
                    "text": text,
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": h,
                    "conf": conf,
                    "block_num": block_num
                })
        return boxes

def render_translated_image(image_bytes: bytes, translated_blocks: List[Dict]) -> bytes:
    """
    Renderiza sobre a imagem os balões com texto traduzido em português.
    """
    with Image.open(io.BytesIO(image_bytes)).convert("RGB") as img:
        draw = ImageDraw.Draw(img)
        
        # Tentar usar fonte truetype limpa ou padrão
        font_size = 14
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            font = ImageFont.load_default()
            
        for b in translated_blocks:
            x, y, w, h = b['x'], b['y'], b['w'], b['h']
            pt_text = b.get('translated', '')
            if not pt_text:
                continue
                
            # Limpar balão com fundo branco com borda sutil
            pad = 4
            draw.rectangle(
                [x - pad, y - pad, x + w + pad, y + h + pad],
                fill=(255, 255, 255),
                outline=(230, 230, 230)
            )
            # Desenhar texto traduzido em preto
            draw.text((x, y), pt_text, fill=(10, 10, 10), font=font)
            
        output = io.BytesIO()
        img.save(output, format="WEBP", quality=85, method=4)
        return output.getvalue()

def translate_chapter(manga_id: str, chapter_number: int, max_pages: int = 10) -> Dict:
    """
    Processa a tradução do capítulo:
    1. Busca URLs das páginas na base 'aaa.capitulos'
    2. Para cada página, faz OCR e traduz os balões
    3. Renderiza a versão traduzida e faz upload no MinIO em 'capitulos_traduzidos/'
    """
    print(f"\n[TRADUÇÃO IA] Iniciando tradução de '{manga_id}' Cap {chapter_number}...")
    
    conn = get_connection()
    pages_urls = []
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT pages_json FROM aaa.capitulos WHERE manga_id=%s AND chapter_number=%s", (manga_id, chapter_number))
                row = cur.fetchone()
                if row:
                    pages_urls = json.loads(row['pages_json']) if isinstance(row['pages_json'], str) else row['pages_json']
        finally:
            conn.close()

    if not pages_urls:
        return {"success": False, "error": "Capítulo não encontrado ou sem páginas"}

    client = get_minio_client()
    translated_pages_urls = []
    page_overlays = []

    # Processar até max_pages para performance rápida
    pages_to_process = pages_urls[:max_pages]

    for idx, page_url in enumerate(pages_to_process, start=1):
        try:
            print(f"  Traduzindo pág {idx:02d}/{len(pages_to_process):02d} ({page_url})...")
            req = urllib.request.Request(page_url, headers={'User-Agent': 'MangaflixApp/1.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                page_raw = resp.read()

            # 1. OCR
            boxes = extract_text_boxes_from_image(page_raw)
            print(f"    -> {len(boxes)} fragmentos de texto detectados")

            # 2. Tradução
            translated_blocks = []
            for b in boxes:
                orig = b['text']
                trans = translate_text_pt(orig)
                b['translated'] = trans
                translated_blocks.append(b)

            # 3. Renderizar nova página WebP com texto em PT-BR
            translated_webp = render_translated_image(page_raw, translated_blocks)
            
            # 4. Upload para MinIO: capitulos_traduzidos/{manga_id}/cap_{chapter_number}/p_{idx:03d}.webp
            obj_name = f"capitulos_traduzidos/{manga_id}/cap_{chapter_number}/p_{idx:03d}.webp"
            if client:
                client.put_object(
                    bucket_name=MINIO_BUCKET,
                    object_name=obj_name,
                    data=io.BytesIO(translated_webp),
                    length=len(translated_webp),
                    content_type="image/webp"
                )
            
            public_url = build_public_url(obj_name)
            translated_pages_urls.append(public_url)
            page_overlays.append({
                "page_index": idx,
                "blocks": translated_blocks
            })
            print(f"    ✓ Página {idx} traduzida salva: {public_url}")

        except Exception as ep:
            print(f"    ✗ Erro na página {idx}: {ep}")
            # Em caso de erro, usa a página original
            translated_pages_urls.append(page_url)

    # Se max_pages foi menor que o total, completar com as originais restantes
    if len(pages_urls) > max_pages:
        translated_pages_urls.extend(pages_urls[max_pages:])

    return {
        "success": True,
        "manga_id": manga_id,
        "chapter_number": chapter_number,
        "translated_count": len(pages_to_process),
        "total_pages": len(pages_urls),
        "pages": translated_pages_urls,
        "overlays": page_overlays
    }
