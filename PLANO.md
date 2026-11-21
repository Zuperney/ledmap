# Plano do Palco

Plano vivo: decisões fechadas, fases e backlog pontuado. Vai junto com o repositório para não se perder entre computadores.

## Decisões fechadas

- **Origem 0,0,0:** centro do palco (X), no chão (Y), na frente (Z). Medidas com sinal nos três eixos:
  - X negativo à esquerda;
  - Y negativo abaixo do chão (fosso, palco rebaixado);
  - Z positivo para trás.
- **Cores dos eixos:** X vermelho, Y (altura) verde, Z (recuo) azul.
- **Vistas 2D travadas** (sem girar a câmera): Frente, Atrás, Esquerda, Direita, Topo.
- **Barra lateral de vistas** na borda direita do desenho, entre o desenho e as Propriedades. As ferramentas continuam à esquerda.
- **2D ⇄ 3D:** um botão transforma a vista atual em 3D com a câmera na mesma posição.
- **Pin padrão:** meio da borda de baixo (antes era o centro). O campo de altura é sempre a altura do pin.

## Fases

### Andamento

- **Etapa 1 feita** (20/11/2026, branch `feat/etapa1-transformacoes`): transformações profissionais, Fase 1 e Fase 2. No 3D, os botões de câmera continuam na barra de cima até a Fase 3.
- **Etapa 2 feita** (20/11/2026, branch `feat/etapa2-layout`): controles do desenho numa faixa embaixo (fora do desenho) em todas as abas com desenho, propriedades do Cabeamento num card à direita, e Screen, Cabeamento e Composição no mesmo molde do Palco na altura da janela.
- **Etapa 3 feita** (20/11/2026, branch `feat/etapa3-montagem`): painel misto (decisões: os menores onde o técnico escolher, mistura na altura e na largura, sugestão com menos gabinetes), duplicar várias em linha ou grade, Camadas com ocultar, travar e ordem, ferramentas Painel por arrasto e Medir.
- **Etapa 4 feita** (20/11/2026, branch `feat/etapa4-visualizacao`): 2D ⇄ 3D com a câmera da vista (Fase 3), gizmo de mover e girar no 3D e multiview de 2 ou 4 vistas.
- No arquivo, o painel continua guardando o canto do quadro (mx, my) no espaço do pai: o pin sai dele de forma exata (canto + fração do pin). O que se vê e se edita é sempre o pin.

### Fase 1: Origem e eixos
- Linhas de eixo coloridas e um marcador na origem, em todas as vistas.
- Régua com sinal nos dois eixos da vista, com metros e um rótulo do eixo (X, Y ou Z).
- Grade simétrica em volta do 0, mais apagada abaixo do chão.
- A barra de estado mostra a coordenada do cursor (os dois eixos da vista).

### Fase 2: Barra lateral de vistas
- Uma faixa vertical com 5 ícones (Frente, Atrás, Esquerda, Direita, Topo), no estilo cubo/casa com a face vista destacada.
- Vista nova **Atrás**: o X fica espelhado na tela, como num programa 3D, e os textos dos painéis continuam legíveis.
- Atalhos:
  - 1 a 5 para as vistas;
  - 0 para ligar e desligar o 3D;
  - F para enquadrar.
- Saem os ícones do canto do desenho e os botões de câmera da barra de cima.

### Fase 3: Botão 2D ⇄ 3D
- O 3D abre com a câmera na orientação da vista atual.
- No 3D, os ícones levam a câmera até a vista, com transição suave, e a órbita fica livre.
- Desligar o 3D volta para a vista 2D mais próxima da câmera.

### Fase 4: Fechamento
- Testes do Atrás e dos eixos em `testes/espaco.mjs`.
- Build e conferência no navegador.
- STATUS.md atualizado.

## Regras de transformação (posição, pin e giro)

Valem para tudo que aparece no palco: painel, grupo e, no futuro, bloco. Nenhuma feature pode quebrar estas regras. **Aprovadas em 20/11/2026.**

### O que deu errado da outra vez
- Hoje a posição gravada (mx, my) é o canto de baixo à esquerda do painel **antes** do giro. O pin é calculado a partir desse canto. Num painel girado, esse canto não existe mais no palco, e por isso o X e o Y do painel mostram valores sem sentido.
- Girar um grupo **desfaz o grupo por dentro**: o giro do grupo é somado no giro e na posição de cada painel. O grupo guarda o giro só como etiqueta. Os valores dos membros mudam toda vez que o grupo gira.
- Cada giro do grupo vira ângulos arredondados a 0,1°. Vários giros seguidos acumulam erro.

### As regras
1. **Árvore fixa:** Palco (mundo) → Grupo → Painel. A origem do Palco (0,0,0 no centro, no chão, na frente) nunca se move e nunca é editada. Todo objeto vive dentro do seu pai.
2. **Toda peça tem três coisas, e só três:**
   - **Pin:** o ponto da própria peça onde ela é presa. Pode ser um dos 9 pontos da face (cantos, meios das bordas, centro), sempre na face da frente.
   - **Posição:** onde o pin está, medido no espaço do pai.
   - **Giro:** X, Y e Z em graus, em volta do pin.
3. **O que se grava é o pin.** A posição gravada é a do pin, e não um canto. Assim, o X de um painel girado é sempre um ponto real do palco.
4. **Girar nunca muda a posição.** O pin fica parado e a peça gira em volta dele, em qualquer vista, pela alça ou pelo campo.
5. **Trocar o pin nunca move a peça.** Ao escolher outro pin, o app recalcula a posição para a peça ficar exatamente onde estava. É o "definir origem" dos programas 3D.
6. **Mudar largura ou altura cresce a partir do pin.** Com o pin embaixo no meio, aumentar a altura cresce para cima e para os dois lados igualmente. O pin não sai do lugar.
7. **O filho herda o espaço do pai, não os valores.**
   - Girar ou mover um grupo muda **só o grupo**. Os painéis guardam posição e giro **relativos ao grupo**, e esses números não mudam.
   - Onde o painel fica no palco é sempre calculado: Palco × Grupo × Painel.
8. **Agrupar e desagrupar nunca movem nada.**
   - Ao agrupar, o grupo ganha um pin (padrão: centro da caixa dos membros, sem giro), e os membros passam a valores relativos ao grupo.
   - Ao desagrupar, cada membro recebe a posição e o giro reais no palco.
9. **Uma ordem de giro só, documentada:** primeiro Z (gira no próprio plano), depois X (inclina), por fim Y (abre em V ou L), sempre nos eixos do pai.
   - Ângulos entre −180° e 180°.
   - A alça e o gizmo trabalham com a matriz do início do arrasto e só convertem para ângulos no fim, sem somar erro.
10. **Precisão fixa:**
    - posições gravadas em milímetros inteiros;
    - ângulos em centésimos de grau;
    - arredondar só na hora de mostrar.
11. **Uma fonte só da verdade:**
    - as 5 vistas 2D, o 3D, o cartão, o cabeamento, a composição e o CSV leem a mesma função de posição no palco;
    - nenhuma tela refaz a conta por conta própria.
12. **Toda vista edita tudo, do jeito da vista:**
    - nas vistas 2D, arrastar move nos dois eixos da tela, e a alça gira no eixo que aponta para quem olha;
    - os campos do cartão editam qualquer eixo em qualquer vista;
    - no 3D, a câmera é livre, e um gizmo move e gira nos três eixos.
13. **O cartão mostra o palco, e o grupo mostra os dois:**
    - para painel solto: posição e giro no palco, mais início e fim reais (X, altura, recuo);
    - para painel dentro de grupo: posição e giro relativos ao grupo, com uma linha "No palco" mostrando os valores reais;
    - um botão Local/Palco troca o que os campos editam.
14. **Espelhar e duplicar respeitam a árvore:**
    - duplicar copia os valores relativos ao pai;
    - espelhar reflete a posição do pin no eixo escolhido e corrige o giro, então espelhar duas vezes volta ao original.
15. **Projetos antigos migram sem mover nada:** ao abrir, o canto antigo vira o pin, e os grupos com giro "derretido" nos membros voltam a ter membros relativos ao grupo. O resultado no palco fica idêntico.

16. **Todo painel nasce em pé, virado para o público, sem giro, com o pin no meio da borda de baixo.**
    - O campo de altura é sempre a altura do pin.
    - Com o pin embaixo, "altura 2,5 m" é a borda de baixo a 2,5 m do chão, antes e depois de girar.

### Caso do teto (o problema da outra vez)
- **Montagem:** um painel de 3 m sobe para 2,5 m e gira 90° em X (inclinar) até a face ficar virada para o piso.
- **Antes:** o giro era em volta do centro, mas o campo mostrava a borda de baixo. Depois de girar, o teto ficava na altura do centro (2,5 + 1,5 = 4 m), e o campo continuava mostrando um número que não era a altura real.
- **Agora:** o pin fica embaixo no meio, a 2,5 m. Girar não move o pin, então o teto fica deitado a 2,5 m do chão. O campo mostra 2,5, e "No palco" mostra a altura de 2,5 a 2,5.
- **Com outro pin:** se o técnico escolher o centro, o campo passa a mostrar a altura do centro (4 m) **antes** de girar. O número na tela sempre é a altura do ponto que não se move.

### Testes obrigatórios (banco `testes/espaco.mjs`)
- Caso do teto: painel de 3 m, pin embaixo, altura 2,5, giro X 90° → as quatro quinas a 2,5 m e o campo de altura em 2,5.
- Girar 360° em qualquer eixo volta exatamente ao início.
- Girar não muda a posição do pin.
- Trocar o pin não move nenhum canto da peça.
- Mudar a medida não move o pin.
- Girar ou mover o grupo não muda os valores relativos dos membros.
- Agrupar → desagrupar devolve os mesmos valores no palco.
- Espelhar duas vezes devolve o original.
- Salvar → abrir devolve os mesmos números.
- Projeto antigo aberto fica com todos os cantos no mesmo lugar.

## Detalhes a definir

- **Painel misto:**
  - onde ficam os gabinetes menores (em cima, embaixo ou escolhido à mão);
  - se mistura nas duas direções (largura e altura) ou só numa;
  - se a sugestão prefere menos gabinetes ou menos tipos.
- **Grupos inteligentes:** se o cabeamento do grupo passa por todos os membros como um painel só, ou se cada membro mantém o seu.

- **Blocos na Screen:**
  - se cada bloco pode ir para um lugar diferente do mapa de pixels (ex.: a faixa de 110 m dobrada em linhas para caber na saída do processador);
  - se cada bloco pode ir para uma Screen ou porta diferente;
  - o que a sugestão usa como base: limite de pixels por porta, largura do mapa ou tamanho igual entre os blocos.

## Pontuação

Cada feature recebe três notas de 1 a 5: **Impacto** (quanto melhora a montagem real), **Urgência** (se trava outra coisa ou se é preciso já) e **Esforço** (quanto trabalho dá).

**Prioridade = (Impacto × 2 + Urgência) ÷ Esforço.** A maior nota vai primeiro.

## Backlog

Notas iniciais sugeridas, para revisar juntos.

| Feature | Impacto | Urgência | Esforço | Prioridade |
|---|---|---|---|---|
| Fase 1: origem e eixos | 5 | 5 | 2 | 7,5 |
| Fase 2: barra de vistas + Atrás | 5 | 5 | 2 | 7,5 |
| Transformações profissionais: giro nos 3 eixos com as regras acima (pin gravado, árvore Palco → Grupo → Painel, valores relativos ao pai, migração dos projetos antigos). É base de duplicação, painel misto, grupos e blocos | 5 | 5 | 4 | 3,8 → sobe para a Etapa 1 |
| Controles do desenho fora do desenho, em todas as abas (zoom, Enquadrar, tela cheia e vistas numa faixa própria, sem cobrir os painéis; o visor é o mesmo em Palco, Screen e Cabeamento, então muda uma vez para todas) | 4 | 4 | 2 | 6,0 |
| Propriedades do Cabeamento num card à direita do desenho, como no Palco (hoje ficam embaixo e se perdem) | 4 | 4 | 2 | 6,0 |
| Painel misto: montar uma medida com gabinetes diferentes (ex.: 3,5 m de altura = 3 × 1 m + 1 × 0,5 m), com sugestão automática da combinação | 5 | 4 | 3 | 4,7 |
| Janela inteira em todas as abas (cabeçalho e abas numa linha só, sem rolar a página, área de trabalho + painel lateral; o Palco já faz isso no PR #2) | 5 | 4 | 3 | 4,7 |
| Duplicação robusta (N cópias com espaçamento, em linha e grade, espelhar) | 5 | 4 | 3 | 4,7 |
| Camadas: ocultar, travar, reordenar | 3 | 3 | 2 | 4,5 |
| Ferramenta Painel por arrasto | 3 | 2 | 2 | 4,0 |
| Ferramenta Medir | 3 | 2 | 2 | 4,0 |
| Fase 3: botão 2D ⇄ 3D | 4 | 3 | 3 | 3,7 |
| Multiview (2 ou 4 vistas lado a lado) | 4 | 3 | 3 | 3,7 |
| Gizmo no 3D: mover e girar nos 3 eixos com a câmera livre, Local/Palco | 4 | 3 | 4 | 2,8 |
| Quebrar painel em blocos na Screen: no Palco continua um painel só (ex.: borda de campo de 110 m); na configuração o técnico divide em blocos, escolhendo à mão quantos gabinetes cada bloco tem (o app pode sugerir, quem decide é o técnico) | 5 | 4 | 4 | 3,5 |
| Grupos inteligentes: o grupo vira um painel (medida total, pixels, cabeamento e endereçamento contínuos); mudar a medida do grupo refaz os membros; agrupar e desagrupar sem perder posição | 5 | 3 | 4 | 3,3 |
| Aba Endereçamento (Cabeamento + Composição + Simulador) | 5 | 3 | 5 | 2,6 |

## Ordem de desenvolvimento

Etapas montadas pela nota, juntando o que mexe nas mesmas partes do app. **Regra de dependência:** uma feature que é base de outras entra na etapa da primeira que depende dela, mesmo com nota menor.

1. **Base (7,5 e 3,8):** Fase 1 (origem e eixos), Fase 2 (barra de vistas + Atrás) e transformações profissionais. As transformações sobem pela regra de dependência: tudo que vem depois mexe em posição e giro.
2. **Layout (6,0 e 4,7):** controles fora do desenho em todas as abas, card do Cabeamento à direita, janela inteira em todas as abas.
3. **Montagem (4,7 a 4,0):** painel misto, duplicação robusta, Camadas, ferramenta Painel por arrasto, ferramenta Medir.
4. **Visualização (3,7 e 2,8):** botão 2D ⇄ 3D (Fase 3), multiview, gizmo no 3D.
5. **Configuração (3,5 a 2,6):** blocos na Screen, grupos inteligentes, aba Endereçamento. Os três andam juntos.

Cada etapa fecha com a Fase 4 (testes, build, conferência no navegador, STATUS.md).
