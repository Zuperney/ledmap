// Ponte entre o Rig e o 3D embutido: o 3D (three.js) só é baixado quando a vista 3D abre, então o resto do app não
// importa vista3d.js; avisa por aqui. Sem 3D aberto, os avisos não fazem nada.
var alvo = null;
export function registrar3D(api) { alvo = api; }
// posição, recuo, giro ou pivô mudou (a cena se refaz agrupando os avisos)
export function avisar3D() { if (alvo) alvo.atualizar(); }
// a seleção mudou (o painel selecionado fica em destaque)
export function avisarSel3D() { if (alvo) alvo.marcarSel(); }
