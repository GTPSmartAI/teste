# Diretrizes de Design Visual: Verde Esmeralda & Identidade Aedolia (GTP Smart)

**Data:** 04/10/2026  
**Referência:** Capturas enviadas pelo Alexandre (`Aedolia - Por GTP Smart` e painel analítico)

---

## 🎨 Paleta de Cores Oficial

```css
/* Fundos & Superfícies (Cyber-Dark Suave) */
--bg-deep:        #050d09; /* Preto esverdeado profundo */
--bg-surface:     #0a1712; /* Cartões e containers */
--bg-elevated:    #0f221a; /* Elementos em destaque / hover */
--border-subtle:  rgba(16, 185, 129, 0.18); /* Bordas com brilho suave */
--border-active:  #00f59b; /* Borda acesa */

/* Destaques Esmeralda (Marca Registrada) */
--emerald-glow:   #00f59b; /* Verde neon esmeralda primário */
--emerald-brand:  #10b981; /* Verde base */
--emerald-dark:   #059669; /* Verde para estados de clique */

/* Tipografia */
--text-primary:   #f1f5f9; /* Branco suave de alto contraste */
--text-muted:     #94a3b8; /* Cinza claro */
--text-dim:       #64748b; /* Cinza médio para micro-labels */
```

---

## 🧩 Componentes Chave Baseados nas Imagens de Referência

1. **Card Superior de Boas-Vindas:**
   - Tag pequena em caixa alta: `PAINEL GERAL` com borda arredondada.
   - Saudação: `OLÁ, ALEXANDRE!` com `ALEXANDRE!` em destaque esmeralda.
   - Pílulas de estatísticas: `[ 📖 14 Mangás ] [ ⚡ 1.420 Caps lidos ] [ ✨ 4 Concluídos ]`.
   - Botão principal: `CONTINUAR LENDO` com fundo verde esmeralda e sombra luminosa (`box-shadow: 0 0 25px rgba(0, 245, 155, 0.4)`).

2. **Chips / Filtros de Categoria:**
   - Estilo pílula: `Todos 14`, `Lendo 3`, `Manhwas 6`, `Shonen 5`.
   - Borda fina verde, fundo escuro semitransparente, estado ativo preenchido ou com borda luminosa.

3. **Cards de Mangá com % Lido:**
   - Borda arredondada suave (16px a 20px).
   - Badge superior direito: `0% LIDO`, `88% LIDO`, `100% LIDO`.
   - Efeito hover com brilho esmeralda nas bordas.

4. **Botão de Ação Rápida & Favoritos:**
   - Coração/Estrela com micro-animação ao salvar na biblioteca pessoal.
