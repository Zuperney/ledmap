import "./styles/reset.css";
import "./styles/themes.css";
import "./styles/base.css";
import "./styles/compact.css";
import "./styles/shell.css";
import { iniciarTemas } from "./themes.js";
import { init as init_core } from "./modules/core.js";
import { init as init_rig } from "./modules/rig.js";
import { init as init_canvas } from "./modules/canvas.js";
import { init as init_tabela } from "./modules/tabela.js";
import { init as init_screens } from "./modules/screens.js";
import { init as init_canvas_edicao } from "./modules/canvas-edicao.js";
import { init as init_visor } from "./modules/visor.js";
import { init as init_cabeamento } from "./modules/cabeamento.js";
import { init as init_sinal_ui } from "./modules/sinal-ui.js";
import { init as init_rig_cabos } from "./modules/rig-cabos.js";
import { init as init_exportar } from "./modules/exportar.js";
import { init as init_projeto } from "./modules/projeto.js";
import { init as init_abas } from "./modules/abas.js";
import { init as init_rig_edicao } from "./modules/rig-edicao.js";
import { init as init_telas } from "./modules/telas.js";
import { init as init_historico } from "./modules/historico.js";
import { init as init_projeto_ui } from "./modules/projeto-ui.js";
import { init as init_gaveta } from "./modules/gaveta.js";
import { init as init_ui } from "./modules/ui.js";

init_core();
init_rig();
init_canvas();
init_tabela();
init_screens();
init_canvas_edicao();
init_visor();
init_cabeamento();
init_rig_cabos();
init_sinal_ui();
init_exportar();
init_projeto();
init_abas();
init_rig_edicao();
init_telas();
init_historico();
init_projeto_ui();
init_gaveta();
init_ui();

iniciarTemas();

if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
}
