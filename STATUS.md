# Led Map — o que já foi feito e o que falta

Repo: https://github.com/Zuperney/ledmap · App: https://zuperney.github.io/ledmap/ · Versão atual: 0.9.0
Objetivo: planejador de rig/canvas/cabeamento de telas LED que substitui o LED Lab Core (LLC), importando as *capacidades* do LLC em fases (não os arquivos de projeto).

## Já feito

**Base e publicação**
- App em Vite (módulos ES), PWA instalável, deploy automático no GitHub Pages (Source = GitHub Actions).
- Temas selecionáveis; seletores/dropdowns próprios do app (sem os nativos do navegador).
- Vários projetos, histórico (desfazer/refazer), exportar/importar JSON (v2), exportar PNG.

**Projeto / Screen**
- Biblioteca de 16 gabinetes (do LLC), com gabinetes não quadrados e que não sejam 50 cm.
- Telas e Screens (grupos), tabela de dados, Rig e Canvas.

**Cabeamento (sinal)**
- Configuração de Sinal: bits (campo livre), Hz, px por porta configurável, 20 portas por Screen (VX2000 + card 20×RJ45), limites por Screen.
- Distribuição automática: estratégias Contínuo / Linha / Coluna / Bloco, 4 cantos de entrada, ordem do próximo cabo (empilhado, linha, zigue-zague, sobe-e-desce no daisy chain).

**Projeto e Rig enxutos**
- Aba Projeto: seletor compacto de projetos (Novo, Duplicar, Excluir), nome, cliente, local, data, observações, resumo (painéis, gabinetes, pixels, kVA de pico), Exportar e Importar (importar abre como projeto novo).
- Projeto novo e primeira abertura: página limpa com um painel só (4 × 3 m, Absen PL3.9). O exemplo de IMAGs/Upstage/Cs não é mais criado.
- Rig: barra com + Painel, Editar, Visão (Grade e Cabos) e Exportar.
- Adicionar painel: só nome, largura, altura e gabinete; posição automática. O campo Tipo saiu; as cores agora são por gabinete (legenda na gaveta).
- Grupos de painel (conceito novo, separado da Screen): Shift (ou Ctrl) + clique seleciona vários painéis no Rig e o botão Grupo vira "Agrupar (n)"; com um painel agrupado selecionado, vira "Desagrupar". O grupo se move junto em Editar (arrastar ou X/Y) e tem contorno com nome automático, medida do conjunto e número de gabinetes diferentes. Salvo no projeto, no JSON e no desfazer. Pendente: multisseleção no celular (sem Shift) e renomear grupo.
- Vocabulário: a interface toda usa "painel" no lugar de "tela" (CSV também). As chaves do JSON continuam "telas" para não quebrar projetos salvos.

**Composição**
- Usa as posições da aba Screen: não há segunda posição para manter.
- Test card com 5 predefinições: mapa de gabinetes (com caixa de informações), alinhamento (círculo, X, cantos), mapa de cabos (sinal), barras de cor e branco sólido.
- Escopo: todas as telas ou uma Screen.
- Regiões (x, y, L × A) relativas à composição, com a proporção de cada tela e Screen (ex.: 16:9, ou 3,32:1 ≈ formato mais próximo). Copiar, CSV e PNG em resolução real.
- Configuração salva por projeto, no JSON e no desfazer.
- Correção: duplicar/excluir projeto agora leva também a Elétrica e a Composição.

**Elétrica**
- Tipo de energia (220 V bi/tri, 380 V mono/bi/tri), dimensionado pelo consumo máximo.
- Por Screen: kVA, W, A, carga em R/S/T com diferença entre fases, cabos de energia que seguem as portas de sinal, regra de 80%.
- Projeto: pico, típico (informativo), gerador mínimo = pico × 1,25 e ocupação típica.
- CSV dos cabos; configuração salva por projeto e incluída no JSON.

## Testado
- Build e fluxo no Chromium em tela de celular (sinal, distribuição automática, seletores, PWA, Elétrica: totais, troca de tensão/margem, CSV, persistência, JSON ida e volta). Sem erros de JavaScript.

## Não testado / ressalvas
- Nada foi testado em celular de verdade.
- Capacidade por porta com bits diferentes de 8 ou 10 é estimativa (você usa só 8 bits).
- Números elétricos não foram conferidos contra um projeto real do LLC.

## O que falta (ordem prevista)
1. **Composição** — feita a base; ficou de fora do LLC: calculadora de distância de visão e o editor fino de test card (cada opção avulsa).
2. **Caderno** — PDF do projeto e exportação de loomex / lista de cabos.
3. **Estrutura e peso** — fase 6 (peso, rigging).
4. **Compartilhamento** — visualização somente leitura por link.
5. **Cabeamento** — régua de área (retângulo) para o Bloco economizar portas em processadores básicos; demais modos de numeração e cortes do LLC; cabos por Screen no Canvas (decidido: 20).
6. **Acabamento** — trocar `prompt`/`confirm` do navegador por janelas do app (oferecido, ainda sem resposta); usar peso/consumo médio dos gabinetes (já guardados, ainda não usados); teste em celular real.
