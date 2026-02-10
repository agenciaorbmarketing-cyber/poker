# PokerMath — Educador de Texas Hold'em (MVP)

Versão mínima publicável e matematicamente correta do *PokerMath*.
Esta versão é 100% estática, gratuita e pronta para publicar no GitHub Pages.

**O que está garantido:**
- Cálculo de equity por Monte Carlo com intervalo de confiança (95%).
- Enumeração exata automática quando o espaço combinatório é pequeno.
- Cálculos corretos de outs (1 carta e 2 cartas).
- Tratamento correto de empates (ties).
- Web Worker para simulações (não bloqueia a UI).
- UI responsiva e explicativa — foco educativo.

**Como publicar (passo a passo para leigos):**
1. Baixe o arquivo `pokermath_site.zip` deste chat e descompacte.
2. Crie um repositório público no GitHub.
3. No repositório, clique em **Add file → Upload files** e arraste todo o conteúdo da pasta descompactada.
4. Commit as alterações.
5. Vá em **Settings → Pages** (ou **Pages** na lateral) e configure:
   - Source: `main` branch (ou `gh-pages` se preferir) and `/ (root)` folder.
6. Salve. O site ficará disponível em `https://<seu-usuario>.github.io/<repo>` em alguns minutos.

Se precisar, eu forneço instruções com imagens passo a passo.

Licença: MIT (arquivo LICENSE incluído).
