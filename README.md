# Led Map

Mapa de telas LED com vários projetos: **Projeto**, **Rig** (montagem em metros), **Screen** (pixels do processador) e **Cabeamento** (portas). Composição, Elétrica e Caderno estão previstos. Exporta pixel map, layout (PNG/CSV) e projeto JSON. Funciona offline e instala no celular (PWA).

**Usar:** https://zuperney.github.io/ledmap/

## Desenvolvimento

```
npm install
npm run dev      # servidor local
npm run build    # gera dist/
```

O push no `main` publica no GitHub Pages (workflow em `.github/workflows/pages.yml`).

## Estrutura

- `index.html`: casca da página (HTML)
- `src/main.js`: carrega estilos e inicia os módulos, em ordem
- `src/modules/`: um arquivo por área (`projetos` lista e dados de cada projeto, `projeto-ui` aba Projeto, `core` dados e persistência, `rig` e `rig-*` montagem, `canvas*` e `screens` canvas, `cabeamento`, `exportar`, `projeto` JSON, `historico` desfazer, `gaveta`, `ui`)
- `src/styles/`: `themes.css` (cores), `base.css`, `compact.css`, `shell.css`
- `src/themes.js`: lista de temas. Para criar um tema: bloco novo em `themes.css` + uma linha em `themes.js`
- `public/`: manifest, service worker e ícones

Os dados ficam só no navegador (localStorage). Use *⋮ Projeto → Exportar projeto (JSON)* para backup.
