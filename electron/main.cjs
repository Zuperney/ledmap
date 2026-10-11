// electron/main.cjs — o Led Map como aplicativo de Windows (a versão web para celular continua igual).
// O app é o mesmo build do site (dist/): o Electron só dá a janela própria, sem barra de navegador.
// Os projetos continuam no localStorage, que o Electron guarda em %APPDATA%\Led Map\ — sobrevivem a
// fechar, reabrir e atualizar. Para levar um projeto entre o app e o site: Exportar/Importar (JSON).
// CommonJS (.cjs) de propósito: o package.json é "type": "module".
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

// Sem empacotar (npm run desktop:dev) abre o servidor do Vite; empacotado, o build local.
const isDev = !app.isPackaged && process.env.LEDMAP_DEV === "1";
const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

// Uma instância só: abrir de novo traz a janela que já está aberta.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;

  function criarJanela() {
    win = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 900,
      minHeight: 600,
      backgroundColor: "#14202b", // a cor do tema, evita um clarão branco antes de o app desenhar
      title: "Led Map",
      icon: path.join(__dirname, "..", "build", "icon.png"),
      autoHideMenuBar: true,
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: false }
    });
    Menu.setApplicationMenu(null);

    if (isDev) win.loadURL(DEV_URL);
    else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));

    win.once("ready-to-show", () => { win.maximize(); win.show(); });

    // links http(s) abrem no navegador do Windows, nunca dentro da janela do app
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//.test(url)) { shell.openExternal(url); return { action: "deny" }; }
      return { action: "allow" };
    });
    win.webContents.on("will-navigate", (e, url) => {
      if (/^https?:\/\//.test(url) && !url.startsWith(DEV_URL)) { e.preventDefault(); shell.openExternal(url); }
    });
    // exportações (PNG, CSV, JSON): o Windows pergunta onde salvar
    win.webContents.session.on("will-download", (_e, item) => {
      item.setSaveDialogOptions({ title: "Salvar " + item.getFilename(), defaultPath: path.join(app.getPath("documents"), item.getFilename()) });
    });
  }

  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(criarJanela);
  app.on("window-all-closed", () => app.quit());
}
