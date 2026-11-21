// Gravação dos dados do projeto no navegador (localStorage) com aviso de falha.
// Antes, um erro ao gravar (o armazenamento do navegador cheio, ou bloqueado) era ignorado em silêncio e o projeto
// parava de ser salvo sem ninguém saber. Agora a falha mostra uma faixa que fica à vista até a próxima gravação dar
// certo, com o caminho para não perder nada: exportar o projeto e liberar espaço.
var faixa = null, falhou = false;

function mostrar() {
  if (!faixa) {
    faixa = document.createElement("div");
    faixa.className = "aviso-salvar";
    faixa.setAttribute("role", "alert");
    var txt = document.createElement("span");
    txt.textContent = "Não consegui salvar as últimas mudanças: o armazenamento do navegador está cheio ou bloqueado. Exporte o projeto agora (Projeto → Exportar projeto) para não perder nada, e exclua projetos antigos para liberar espaço.";
    var ir = document.createElement("button");
    ir.type = "button"; ir.className = "btn"; ir.textContent = "Exportar projeto";
    ir.addEventListener("click", function () { var b = document.getElementById("proj-export"); if (b) b.click(); });
    var x = document.createElement("button");
    x.type = "button"; x.className = "btn"; x.textContent = "✕"; x.setAttribute("aria-label", "Fechar o aviso");
    x.addEventListener("click", function () { faixa.hidden = true; });
    faixa.appendChild(txt); faixa.appendChild(ir); faixa.appendChild(x);
    document.body.appendChild(faixa);
  }
  faixa.hidden = false;
}

// grava texto na chave; devolve true se deu certo. Uma falha mostra o aviso; a próxima gravação boa esconde.
export function gravarDados(chave, texto) {
  try {
    localStorage.setItem(chave, texto);
    if (falhou) { falhou = false; if (faixa) faixa.hidden = true; }
    return true;
  } catch (e) {
    falhou = true;
    if (typeof document !== "undefined") mostrar();
    return false;
  }
}
