// Ícones das vistas, como os do SketchUp: uma casinha vista de cada lado, com a face olhada em destaque.
// A casinha tem o oitão (a ponta do telhado) e a porta virados para o público e a chaminé no fundo, então dá para
// reconhecer a vista pelo desenho: na Esquerda a chaminé fica à esquerda (o público está à direita), na Direita ao
// contrário; no Topo o fundo fica em cima e a porta embaixo. Traço em currentColor.
var A = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">';
var F = '</svg>';
var FACE = 'fill="currentColor" fill-opacity=".28"';

export var ICONES_VISTA = {
  // de frente: o oitão com a porta; a chaminé aparece atrás do telhado
  frente: A + '<path d="M15 7.5V4h2v5.5"/><path ' + FACE + ' d="M5 20v-9l7-6.5 7 6.5v9z"/><path d="M10.5 20v-5h3v5"/>' + F,
  // de trás: o oitão do fundo, sem porta, com uma janela; a chaminé fica na frente do telhado (do lado de quem olha)
  tras: A + '<path ' + FACE + ' d="M5 20v-9l7-6.5 7 6.5v9z"/><path d="M7 9.2V4h2v3.4"/><path d="M10.5 13h3v3h-3z"/>' + F,
  // de cima: o telhado com a cumeeira no meio (fundo em cima), a chaminé atrás e a porta embaixo
  topo: A + '<path ' + FACE + ' d="M6 4h12v15H6z"/><path d="M12 4v15"/><path d="M14.5 5.5h2v2h-2z"/><path d="M10.5 21h3"/>' + F,
  // da esquerda: a lateral; o fundo (chaminé) à esquerda, o público à direita
  esq: A + '<path d="M6.5 6V3h2v3"/><path d="M3.5 11h17L18 6H6z"/><path ' + FACE + ' d="M4.5 11h15v9h-15z"/><path d="M14 14h3v3h-3z"/>' + F,
  // da direita: a mesma lateral espelhada
  dir: A + '<path d="M15.5 6V3h2v3"/><path d="M3.5 11h17L18 6H6z"/><path ' + FACE + ' d="M4.5 11h15v9h-15z"/><path d="M7 14h3v3H7z"/>' + F,
  // 3D: a casinha em perspectiva (frente, lateral e telhado)
  "3d": A + '<path ' + FACE + ' d="M3.5 20.5v-8l4.5-4.5 4.5 4.5v8z"/><path d="M12.5 20.5l8-3.5v-7.5l-8 3"/><path d="M8 8l8-4 4.5 5.5-8 3"/><path d="M6.5 20.5V17h2.5v3.5"/>' + F
};
