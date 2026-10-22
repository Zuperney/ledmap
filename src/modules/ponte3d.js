// Ponte entre o Rig e quem mostra a montagem fora do desenho principal: o 3D embutido e as miniaturas do mosaico.
// O 3D (three.js) só é baixado quando abre, então o resto do app não importa vista3d.js; avisa por aqui.
// Sem ninguém ouvindo, os avisos não fazem nada.
var alvo = null, ouvintes = [];
export function registrar3D(api) { alvo = api; }
// miniaturas: fn("mudou") quando algo muda de lugar, fn("sel") quando a seleção muda
export function ouvirRig(fn) { ouvintes.push(fn); return function () { ouvintes = ouvintes.filter(function (f) { return f !== fn; }); }; }
// posição, recuo, giro ou pivô mudou (cada um agrupa os avisos)
export function avisar3D() { if (alvo) alvo.atualizar(); ouvintes.forEach(function (f) { f("mudou"); }); }
// a seleção mudou (o painel selecionado fica em destaque)
export function avisarSel3D() { if (alvo) alvo.marcarSel(); ouvintes.forEach(function (f) { f("sel"); }); }
