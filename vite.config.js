import { defineConfig } from "vite";

// Põe o CSS dentro do index.html: a tela nunca aparece sem estilo, mesmo que um arquivo falhe ao baixar.
function cssNoHtml() {
  return {
    name: "css-no-html",
    enforce: "post",
    generateBundle(_, bundle) {
      const html = bundle["index.html"];
      if (!html) return;
      Object.keys(bundle).forEach(function (k) {
        if (!k.endsWith(".css")) return;
        const nome = k.split("/").pop().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const css = String(bundle[k].source).replace(/<\/style/gi, "<\\/style");
        const re = new RegExp('<link[^>]*href="[^"]*' + nome + '"[^>]*>');
        if (!re.test(html.source)) return;
        html.source = html.source.replace(re, function () { return "<style>" + css + "</style>"; });
        delete bundle[k];
      });
    }
  };
}

export default defineConfig({ base: "./", plugins: [cssNoHtml()], build: { outDir: "dist", assetsInlineLimit: 0, chunkSizeWarningLimit: 600 /* o pedaço da Vista 3D (three.js) é grande, mas só baixa quando abre */ } });
