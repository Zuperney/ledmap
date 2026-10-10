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
- Projeto novo e primeira abertura: Rig vazio, sem painel. O exemplo de IMAGs/Upstage/Cs não é mais criado.
- Editar painel: no Rig, em Editar, o botão "Editar painel" abre o modal com nome, largura, altura e gabinete já preenchidos. A posição, a Screen e o grupo ficam; se a grade de gabinetes muda, as rotas de cabo que passavam pelo painel saem (com aviso).
- Duplicar: botão no Rig (e o Duplicar da gaveta). Copia o painel selecionado; se ele estiver num grupo, copia o grupo inteiro com a mesma arrumação, num grupo novo "… cópia". A cópia vai para o primeiro espaço livre no Rig e na Screen, com a mesma Screen e o mesmo gabinete.
- Recortar gabinetes: no Rig, em Editar, "Recortar" liga um modo em que tocar num gabinete tira ou devolve (arrastando, vários de uma vez), para montar triângulo, escada, vão. Ao desligar (ou sair de Editar) grava e recarrega. Gabinete recortado não existe em lugar nenhum: contagem, pixels, cabeamento (manual e automático), elétrica, composição e exportações; rotas que passavam por ele saem. O painel fica com pelo menos um gabinete. Duplicar leva os recortes; trocar o gabinete no Editar painel limpa os recortes. No JSON: "recortes" de cada painel.
- Excluir painel: botão Excluir no Rig (painel selecionado ou a multisseleção, com confirmação) e tecla Delete. As rotas de cabo que passavam por ele somem junto.
- Biblioteca de gabinetes (⋮ → Gabinetes…, ou "Criar ou editar gabinetes…" no Adicionar painel): lista com busca, criar, editar, duplicar e excluir. Campos: marca, nome, pixels, tamanho em mm, peso, potência máxima, consumo no preto, fator de potência, conector e corrente. Vale para todos os projetos do aparelho; cada projeto guarda a definição dos gabinetes que usa (no armazenamento e no JSON) e os devolve à biblioteca se faltarem. Gabinete em uso no projeto aberto não pode ser excluído; editar um em uso recarrega e ajusta os painéis. "Limpar biblioteca" tira todos os que o projeto aberto não usa (a biblioteca pode ficar vazia; o Adicionar painel avisa) e "Restaurar de fábrica" devolve os 16 de fábrica que faltam.
- Carga da porta de sinal = área do retângulo que envolve os gabinetes dela (o processador reserva o retângulo), e não a soma dos gabinetes. Vale para o status OK/Excede de cada porta e para a distribuição automática: no modo Contínuo a serpentina é cortada para que nenhum retângulo passe do limite (com o menor número de portas e tamanhos parecidos); Linha, Coluna e Bloco já cortam em retângulos.
- Distribuição automática segue a montagem: a serpentina e a ordem das portas usam as posições do Rig (metros) e um cabo só passa para o próximo gabinete se os dois se encostam fisicamente; a área continua medida no canvas do processador. Em Linha/Coluna/Bloco, painéis só formam uma área única se encostam no Rig e no canvas; se um bloco passar do limite no canvas, aquela área volta para o Contínuo.
- Pendente: os cabos de energia sem porta de sinal ainda usam a serpentina do canvas.
- Service worker só no build publicado (no servidor de desenvolvimento ele servia código velho).
- Rig: barra com + Painel, Editar, Visão (Grade e Cabos) e Exportar.
- Adicionar painel: só nome, largura, altura e gabinete; posição automática. O campo Tipo saiu; as cores agora são por gabinete (legenda na gaveta).
- Grupos de painel (conceito novo, separado da Screen): Shift (ou Ctrl) + clique seleciona vários painéis no Rig e o botão Grupo vira "Agrupar (n)"; com um painel agrupado selecionado, vira "Desagrupar". O grupo se move junto em Editar (arrastar ou X/Y) e tem contorno com nome automático, medida do conjunto e número de gabinetes diferentes. Salvo no projeto, no JSON e no desfazer. No celular (sem Shift): tocar em Grupo liga o modo de seleção (o painel já selecionado entra), cada toque marca ou desmarca um painel, e o botão vira "Agrupar (n)"; com menos de 2 marcados ele vira "Cancelar". Pendente: renomear grupo.
- Vocabulário: a interface toda usa "painel" no lugar de "tela" (CSV também). As chaves do JSON continuam "telas" para não quebrar projetos salvos.

**Composição**
- Dois modos, como a entrada e a saída do Resolume: **Montagem** (entrada: os painéis nas posições do Rig, numa escala única de px por metro, a maior densidade do projeto, onde o conteúdo é feito) e **Composição** (saída: as posições da aba Screen em px nativos, o que vai para o processador). A tabela de regiões mostra a outra ponta de cada painel; Copiar e o CSV levam entrada → saída de cada região.
- Na Montagem, cada grupo de painéis é uma imagem só: o test card (alinhamento, barras e caixa de informações) é desenhado uma vez sobre o grupo inteiro, e o grupo aparece como uma região na tabela e no Copiar, com os painéis dele (cada um com sua saída). O CSV ganhou a coluna "grupo". Os gabinetes continuam numerados painel a painel.
- Mapa de cabos (sinal): cada gabinete mostra a sua ordem no cabo (1, 2, 3…), como na aba Cabeamento.
- Cor por painel (predefinição nova): cada painel tem uma cor, a mesma na Montagem e na Composição, para ver para onde cada região vai; gabinetes em xadrez de dois tons e o nome do painel (e do grupo) em destaque. Painéis agrupados usam a cor do grupo. Cores automáticas, trocáveis pela amostra na tabela de regiões ("Voltar às cores automáticas" desfaz); salvas no projeto e no JSON.
- Não há posição própria para manter: usa as do Rig e as da Screen.
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
