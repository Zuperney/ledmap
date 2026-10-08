/* Lista de temas e persistência da escolha. Os valores ficam em styles/themes.css. */
export const THEMES = [
  { id: "auto", nome: "Automático", cor: "#14202b" },
  { id: "claro", nome: "Claro", cor: "#eef1f4" },
  { id: "escuro", nome: "Escuro", cor: "#0e161d" },
  { id: "norte", nome: "Norte", cor: "#000000" },
  { id: "instrumento", nome: "Instrumento", cor: "#12140f" },
  { id: "palco", nome: "Palco", cor: "#0f0b1a" },
  { id: "papel", nome: "Papel", cor: "#f3efe6" },
  { id: "contraste", nome: "Alto contraste", cor: "#000000" },
];
const KEY = "ledmap-tema";
export function temaSalvo() {
  try { var v = localStorage.getItem(KEY); return THEMES.some(function (t) { return t.id === v; }) ? v : "auto"; } catch (e) { return "auto"; }
}
export function aplicarTema(id) {
  var t = THEMES.filter(function (x) { return x.id === id; })[0] || THEMES[0];
  if (t.id === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t.id);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", t.id === "auto" ? (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "#0e161d" : "#eef1f4") : t.cor);
  try { localStorage.setItem(KEY, t.id); } catch (e) {}
  return t.id;
}
export function iniciarTemas() {
  var sel = document.getElementById("theme-sel");
  if (!sel) return;
  THEMES.forEach(function (t) { var o = document.createElement("option"); o.value = t.id; o.textContent = t.nome; sel.appendChild(o); });
  sel.value = temaSalvo();
  sel.addEventListener("change", function () { aplicarTema(sel.value); });
  aplicarTema(sel.value);
}
