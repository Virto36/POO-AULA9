// FecapStudy — Aula 9 (PBL): domínio (missões 1-8), tela (9) e cliente do backend (10).
// Navegador: <script src="app.js"></script> | Terminal: node app.js
const URL_API = "http://localhost:5080";
const ME = { nome: "Vitor de Moura Lima", ra: "RA-000000", email: "vitor@fecap.br" }; // troque pelos seus dados

// Interfaces: o JS não tem "interface", então o contrato é a lista de métodos.
// INotificador = obterCanal, enviarAlerta | IExportavelJson = paraJson
const contrato = (o, ...ms) => {
  const falta = ms.filter((m) => typeof o?.[m] !== "function");
  if (falta.length) throw new TypeError(`${o?.constructor?.name} não cumpre o contrato: falta ${falta.join(", ")}`);
};

// ---- Missão 1: Disciplina
class Disciplina {
  #cod; #nome; #cat; #horas;
  constructor(cod, nome, cat, horas) { this.#cod = cod; this.#nome = nome; this.#cat = cat; this.#horas = horas > 0 ? horas : 2; }
  getCodigo() { return this.#cod; } getNome() { return this.#nome; }
  getCategoria() { return this.#cat; } getHoras() { return this.#horas; }
  calcularCargaEmMinutos() { return this.#horas * 60; }
  exibirResumo() { return `[${this.#cod}] ${this.#nome} (${this.#cat}) — ${this.#horas}h/semana (${this.calcularCargaEmMinutos()} min)`; }
}

// ---- Missão 2: MetaEstudo (encapsulamento) + paraJson da missão 6
class MetaEstudo {
  #meta; #feito = 0;
  constructor(meta) { this.redefinirMeta(meta); }
  redefinirMeta(n) { this.#meta = Math.min(3000, Math.max(30, Number(n) || 30)); }
  registrarAvanco(min) {
    if (!Number.isInteger(min) || min <= 0 || min > 480) return false;
    this.#feito += min; return true;
  }
  getMeta() { return this.#meta; } getMinutosCumpridos() { return this.#feito; }
  calcularPercentual() { return Math.min(100, this.#feito / this.#meta * 100); }
  estaCumprida() { return this.#feito >= this.#meta; }
  paraJson() { return JSON.stringify({ metaMinutosSemana: this.#meta, minutosCumpridos: this.#feito, percentual: +this.calcularPercentual().toFixed(1) }); }
}

// ---- Missão 4: SessaoEstudo (abstrata) e as 3 modalidades
class SessaoEstudo {
  #disc; #min;
  constructor(disc, min) {
    if (new.target === SessaoEstudo) throw new Error("SessaoEstudo é abstrata");
    if (!(disc instanceof Disciplina)) throw new TypeError("Disciplina inválida");
    if (!Number.isInteger(min) || min <= 0) throw new RangeError("A duração deve ser um inteiro maior que 0");
    this.#disc = disc; this.#min = min;
  }
  getDisciplina() { return this.#disc; } getDuracaoMinutos() { return this.#min; }
  obterModalidade() { throw new Error("abstrato"); }
  calcularXp() { throw new Error("abstrato"); }
  gerarFeedback() { return `${this.obterModalidade()} em ${this.#disc.getNome()} (${this.#min} min) -> +${this.calcularXp()} XP`; }
  paraJson() {
    return JSON.stringify({ disciplina: this.#disc.getNome(), tipoModalidade: this.obterModalidade(),
      duracaoMinutos: this.#min, xpGanho: this.calcularXp(), resumoFeedback: this.gerarFeedback() });
  }
}
class SessaoPomodoro extends SessaoEstudo {
  #ciclos;
  constructor(disc, min, ciclos) { super(disc, min); this.#ciclos = Math.max(0, ciclos | 0); }
  obterModalidade() { return "Pomodoro"; }
  calcularXp() { return this.getDuracaoMinutos() * 2 + this.#ciclos * 15; }
  gerarFeedback() { return `${super.gerarFeedback()} | ${this.#ciclos} ciclo(s)`; }
}
class SessaoExercicios extends SessaoEstudo {
  #total; #acertos;
  constructor(disc, min, total, acertos) {
    super(disc, min);
    if (!(total >= 0) || !(acertos >= 0 && acertos <= total)) throw new RangeError("Acertos devem ficar entre 0 e o total de questões");
    this.#total = total; this.#acertos = acertos;
  }
  obterModalidade() { return "Exercicios"; }
  calcularXp() { return this.getDuracaoMinutos() + this.#acertos * 10; }
  gerarFeedback() { return `${super.gerarFeedback()} | acertos: ${this.#acertos}/${this.#total} (${this.#total ? Math.round(this.#acertos / this.#total * 100) : 0}%)`; }
}
class SessaoLeitura extends SessaoEstudo {
  #pags; #resumo;
  constructor(disc, min, pags, resumo) { super(disc, min); this.#pags = Math.max(0, pags | 0); this.#resumo = !!resumo; }
  obterModalidade() { return "Leitura"; }
  calcularXp() { return this.getDuracaoMinutos() + this.#pags * 3 + (this.#resumo ? 25 : 0); }
}

// ---- Missão 3: Usuario (abstrata) e os perfis. A senha não tem getter.
class Usuario {
  #id; #nome; #email; #senha;
  constructor(id, nome, email, senha) {
    if (new.target === Usuario) throw new Error("Usuario é abstrata");
    this.#id = id; this.#nome = nome; this.#email = email; this.#senha = senha;
  }
  getId() { return this.#id; } getNome() { return this.#nome; } getEmail() { return this.#email; }
  autenticar(senha) { return senha === this.#senha; }
  obterTipoPerfil() { throw new Error("abstrato"); }
  gerarPainelResumo() { throw new Error("abstrato"); }
}
class Administrador extends Usuario {
  #cargo;
  constructor(id, nome, email, senha, cargo) { super(id, nome, email, senha); this.#cargo = cargo; }
  obterTipoPerfil() { return "Administrador"; }
  gerarPainelResumo() { return `Administrador: ${this.getNome()} | ${this.#cargo}`; }
}
class Responsavel extends Usuario {
  #parentesco; #discentes = [];
  constructor(id, nome, email, senha, parentesco) { super(id, nome, email, senha); this.#parentesco = parentesco; }
  obterTipoPerfil() { return "Responsável"; }
  // Missão 7 (associação): o discente é criado fora e só vinculado aqui
  vincularDiscente(d) {
    if (!(d instanceof Discente)) throw new TypeError("Só é possível vincular um Discente");
    if (this.#discentes.includes(d)) return false;
    this.#discentes.push(d); return true;
  }
  getDiscentes() { return [...this.#discentes]; }
  gerarPainelResumo() { return `Responsável: ${this.getNome()} (${this.#parentesco}) | ${this.#discentes.length} discente(s)`; }
}
class Discente extends Usuario {
  #ra; #xp = 0; #historico = [];
  constructor(id, nome, email, senha, ra) { super(id, nome, email, senha); this.#ra = ra; }
  getXpTotal() { return this.#xp; } getHistorico() { return [...this.#historico]; }
  obterTipoPerfil() { return "Discente"; }
  adicionarXp(p) { if (!(p >= 0)) return false; this.#xp += p; return true; }
  // Missão 5 (sobrecarga): o JS não aceita dois métodos com o mesmo nome,
  // então um método só olha os argumentos para ver qual forma foi chamada.
  //   registrarEstudo(sessao) | (disciplina, minutos) | (disciplina, horaInicio, horaFim, paginas)
  registrarEstudo(a, b, c, d) {
    let s;
    if (a instanceof SessaoEstudo) s = a;
    else if (a instanceof Disciplina && c === undefined) s = new SessaoPomodoro(a, b, Math.max(1, Math.floor(b / 25)));
    else if (a instanceof Disciplina && d !== undefined) {
      if (!(c > b)) throw new RangeError("A hora final deve ser maior que a inicial");
      s = new SessaoLeitura(a, Math.round((c - b) * 60), d, true);
    } else throw new TypeError("Argumentos inválidos em registrarEstudo");
    this.#historico.push(s); this.adicionarXp(s.calcularXp());
    return s;
  }
  gerarPainelResumo() { return `Discente: ${this.getNome()} | ${this.#ra} | XP: ${this.#xp}`; }
}

// ---- Missão 6: notificadores (INotificador)
class NotificadorEmail {
  constructor(saida = console.log) { this.saida = saida; }
  obterCanal() { return "E-mail"; }
  enviarAlerta(dest, msg) { if (!dest || !msg) return false; this.saida(`[E-mail] ${dest}: ${msg}`); return true; }
}
class NotificadorWhatsApp {
  constructor(saida = console.log) { this.saida = saida; }
  obterCanal() { return "WhatsApp"; }
  enviarAlerta(dest, msg) { if (!dest || !msg) return false; this.saida(`[WhatsApp] ${dest}: ${msg}`); return true; }
}
class NotificadorPainel {
  constructor(saida = console.log) { this.saida = saida; }
  obterCanal() { return "Painel"; }
  enviarAlerta(dest, msg) { if (!dest || !msg) return false; this.saida(`[Painel] ${dest}: ${msg}`); return true; }
}

// ---- Missão 7: TrilhaEstudo (agregação). As disciplinas existem fora da trilha.
class TrilhaEstudo {
  #titulo; #admin; #disciplinas = [];
  constructor(titulo, admin) {
    if (!(admin instanceof Administrador)) throw new TypeError("A trilha precisa de um Administrador");
    this.#titulo = titulo; this.#admin = admin;
  }
  getTitulo() { return this.#titulo; }
  adicionarDisciplina(d) {
    if (!(d instanceof Disciplina)) throw new TypeError("Só aceita Disciplina");
    if (this.#disciplinas.includes(d)) return false;
    this.#disciplinas.push(d); return true;
  }
  calcularCargaHorariaTotal() { return this.#disciplinas.reduce((t, d) => t + d.getHoras(), 0); }
}

// ---- Missão 8: PlanoEstudo (composição). O item só nasce dentro do plano.
class ItemCronograma {
  constructor(dia, min) { this.dia = dia; this.min = min; }
}
class PlanoEstudo {
  #itens = [];
  adicionarItem(dia, min) {
    if (!dia || !(min > 0)) return false;
    this.#itens.push(new ItemCronograma(dia, min)); return true;
  }
  calcularTotalMinutos() { return this.#itens.reduce((t, i) => t + i.min, 0); }
  listarResumo() { return this.#itens.map((i) => `${i.dia}: ${i.min} min`); }
}

// ---- Missão 8: ServicoAlertaResponsavel (dependência, sem atributos)
class ServicoAlertaResponsavel {
  avaliarDiscente(d, meta, resp, notificador) {
    contrato(notificador, "obterCanal", "enviarAlerta");
    const msg = meta.estaCumprida()
      ? `Parabéns! ${d.getNome()} atingiu 100% da meta semanal.`
      : `${d.getNome()} está com ${meta.calcularPercentual().toFixed(1)}% da meta (${meta.getMinutosCumpridos()}/${meta.getMeta()} min).`;
    return notificador.enviarAlerta(resp.getEmail(), msg);
  }
}

// ---- Missão 10: cliente do backend (porta 5080)
class ClienteBackendEstudo {
  #base;
  constructor(base = URL_API) { this.#base = base; }
  async #req(rota, corpo) {
    const opcoes = corpo && { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) };
    const r = await fetch(this.#base + rota, opcoes).catch(() => { throw new Error("Backend offline em " + this.#base); });
    const json = await r.json().catch(() => null);
    if (!r.ok) throw new Error(json?.erro || `Erro ${r.status}`);
    return json;
  }
  status() { return this.#req("/api/status"); }
  listarSessoes() { return this.#req("/api/sessoes"); }
  relatorio(nome) { return this.#req("/api/relatorio/" + encodeURIComponent(nome)); }
  salvarMeta(discenteNome, responsavelNome, metaMinutosSemana) { return this.#req("/api/metas", { discenteNome, responsavelNome, metaMinutosSemana }); }
  salvarSessao(discenteNome, sessao) {
    contrato(sessao, "paraJson");
    return this.#req("/api/sessoes", { discenteNome, ...JSON.parse(sessao.paraJson()) });
  }
}

// Monta a sessão certa a partir dos campos da tela (a tela não calcula XP).
function criarSessao(m, disc, min, extra, total, resumo) {
  if (m === "Pomodoro") return new SessaoPomodoro(disc, min, extra);
  if (m === "Exercicios") return new SessaoExercicios(disc, min, total, extra);
  if (m === "Leitura") return new SessaoLeitura(disc, min, extra, resumo);
  throw new Error("Modalidade desconhecida");
}

// ---- Missão 9: tela
function iniciarTela() {
  const $ = (id) => document.getElementById(id);
  document.title = "FecapStudy";
  document.body.insertAdjacentHTML("beforeend", `
  <style>
    body{margin:0;background:#011a14;color:#e6f2ee;font:16px/1.5 "Segoe UI",Arial,sans-serif}
    #app{max-width:900px;margin:auto;padding:1rem}
    header{background:#023327;border-bottom:4px solid #00E387;padding:.8rem 1rem;display:flex;justify-content:space-between;align-items:center}
    h1{margin:0;font-size:1.3rem} h2{margin:0 0 .5rem;font-size:1rem;color:#00E387}
    .g{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem} @media(max-width:700px){.g{grid-template-columns:1fr}}
    .c{background:#022a21;border:1px solid #0f4a3c;border-radius:8px;padding:1rem;margin-top:1rem} .g .c{margin:0}
    label{display:block;font-size:.85rem;color:#9fbdb3;margin-top:.5rem}
    select,input{width:100%;padding:.4rem;background:#011a14;color:#e6f2ee;border:1px solid #0f4a3c;border-radius:5px;font:inherit}
    input[type=checkbox]{width:auto} button{margin:.7rem .4rem 0 0;padding:.5rem .9rem;border:0;border-radius:5px;background:#00E387;color:#023327;font-weight:600;cursor:pointer}
    .barra{height:20px;background:#011a14;border:1px solid #0f4a3c;border-radius:10px;overflow:hidden} #barra{height:100%;width:0;background:#00E387;transition:width .4s}
    ul{list-style:none;padding:0;margin:.4rem 0 0} li{padding:.4rem .6rem;margin:.3rem 0;background:#011a14;border-left:3px solid #00E387;font-size:.9rem}
    pre{background:#011a14;padding:.6rem;overflow:auto;max-height:200px;font-size:.8rem}
    #aviso{position:fixed;right:1rem;bottom:1rem;max-width:340px;background:#023327;border:1px solid #00E387;border-radius:8px;padding:.7rem 1rem;display:none}
  </style>
  <div id="app">
    <header><h1>FecapStudy</h1><span id="st">Backend: verificando…</span></header>
    <div class="g"><div class="c"><h2>Discente</h2><div id="pd"></div></div><div class="c"><h2>Responsável</h2><div id="pr"></div></div></div>
    <div class="g">
      <div class="c"><h2>Nova sessão de estudo</h2>
        <label>Disciplina</label><select id="disc"></select>
        <label>Modalidade</label><select id="mod"><option>Pomodoro</option><option>Exercicios</option><option>Leitura</option></select>
        <label>Duração (min)</label><input id="min" type="number" value="25" min="1">
        <label id="lex">Ciclos completos</label><input id="ex" type="number" value="1" min="0">
        <div id="bt" hidden><label>Total de questões</label><input id="tot" type="number" value="10" min="0"></div>
        <div id="br" hidden><label><input id="res" type="checkbox"> Fiz resumo (+25 XP)</label></div>
        <button id="reg">Registrar Estudo</button></div>
      <div class="c"><h2>Meta semanal</h2><div class="barra"><div id="barra"></div></div><p id="pct"></p>
        <label>Canal do alerta</label><select id="canal"><option>E-mail</option><option>WhatsApp</option><option>Painel</option></select>
        <button id="not">Notificar Responsável</button></div>
    </div>
    <div class="c"><h2>Histórico (memória)</h2><ul id="hist"></ul></div>
    <div class="c"><h2>Backend C# / MySQL</h2><button id="car">Carregar Histórico do Servidor</button><button id="rel">Ver Relatório</button><ul id="srv"></ul><pre id="out" hidden></pre></div>
  </div><div id="aviso"></div>`);

  const discs = [
    new Disciplina("ADS201", "Programação Orientada a Objetos", "Computação", 4),
    new Disciplina("ADS202", "Banco de Dados", "Dados", 4),
    new Disciplina("ADS203", "Engenharia de Software", "Computação", 3),
    new Disciplina("ADS204", "Projeto Interdisciplinar", "Projetos", 4),
  ];
  const admin = new Administrador(1, "Coordenação PI", "coord@fecap.br", "123", "Coordenação PI");
  const resp = new Responsavel(2, "Carlos", "carlos@email.com", "123", "Pai");
  const eu = new Discente(3, ME.nome, ME.email, "123", ME.ra);
  const meta = new MetaEstudo(200), api = new ClienteBackendEstudo(), alerta = new ServicoAlertaResponsavel();
  resp.vincularDiscente(eu);
  const trilha = new TrilhaEstudo("Trilha 2º Semestre ADS", admin);
  discs.forEach((d) => trilha.adicionarDisciplina(d));

  let timer;
  const aviso = (msg, erro) => {
    const a = $("aviso"); a.textContent = msg; a.style.display = "block"; a.style.borderColor = erro ? "#ff8f85" : "#00E387";
    clearTimeout(timer); timer = setTimeout(() => (a.style.display = "none"), 5000);
  };
  const itens = (ul, textos) => { ul.replaceChildren(...textos.map((t) => Object.assign(document.createElement("li"), { textContent: t }))); };
  const notif = { "E-mail": new NotificadorEmail(aviso), WhatsApp: new NotificadorWhatsApp(aviso), Painel: new NotificadorPainel(aviso) };

  const atualizar = () => {
    $("pd").textContent = eu.gerarPainelResumo(); $("pr").textContent = resp.gerarPainelResumo();
    const p = meta.calcularPercentual();
    $("barra").style.width = p + "%";
    $("pct").textContent = `${p.toFixed(1)}% — ${meta.getMinutosCumpridos()} de ${meta.getMeta()} min${meta.estaCumprida() ? " ✔ meta cumprida" : ""}`;
    itens($("hist"), eu.getHistorico().map((s) => s.gerarFeedback()));
  };
  const campos = () => {
    const m = $("mod").value;
    $("lex").textContent = { Pomodoro: "Ciclos completos", Exercicios: "Acertos", Leitura: "Páginas lidas" }[m];
    $("bt").hidden = m !== "Exercicios"; $("br").hidden = m !== "Leitura";
  };
  discs.forEach((d, i) => $("disc").add(new Option(`${d.getCodigo()} — ${d.getNome()}`, i)));
  $("mod").onchange = campos;

  $("reg").onclick = async () => {
    try {
      const s = criarSessao($("mod").value, discs[$("disc").value], +$("min").value, +$("ex").value, +$("tot").value, $("res").checked);
      if (!meta.registrarAvanco(s.getDuracaoMinutos())) return aviso("A meta só aceita sessões de 1 a 480 minutos.", true);
      eu.registrarEstudo(s); atualizar();
      try { await api.salvarSessao(eu.getNome(), s); aviso(`Gravado no backend! +${s.calcularXp()} XP`); }
      catch (e) { aviso("Ficou só na memória. " + e.message, true); }
    } catch (e) { aviso(e.message, true); }
  };
  $("not").onclick = () => alerta.avaliarDiscente(eu, meta, resp, notif[$("canal").value]);
  $("car").onclick = async () => {
    try {
      const l = await api.listarSessoes();
      itens($("srv"), l.length ? l.map((s) => `${s.discenteNome} — ${s.disciplina} (${s.tipoModalidade}, ${s.duracaoMinutos} min) +${s.xpGanho} XP`) : ["Nenhuma sessão no servidor ainda."]);
    } catch (e) { aviso(e.message, true); }
  };
  $("rel").onclick = async () => {
    try { $("out").textContent = JSON.stringify(await api.relatorio(eu.getNome()), null, 2); $("out").hidden = false; }
    catch (e) { aviso(e.message, true); }
  };

  campos(); atualizar();
  api.status()
    .then(() => { $("st").textContent = "Backend: online ✅"; return api.salvarMeta(eu.getNome(), resp.getNome(), meta.getMeta()); })
    .catch(() => { $("st").textContent = "Backend: offline ❌"; aviso("Backend desligado. Rode o server.js ou o iniciar_backend.bat.", true); });
}

// ---- Teste no terminal (missões 1 a 8): node app.js
function demo() {
  const poo = new Disciplina("ADS201", "Programação Orientada a Objetos", "Computação", 4);
  const bd = new Disciplina("ADS202", "Banco de Dados", "Dados", 4);
  const es = new Disciplina("ADS203", "Engenharia de Software", "Computação", -4);
  console.log("-- 1"); [poo, bd, es].forEach((d) => console.log(d.exibirResumo()));
  const meta = new MetaEstudo(100);
  console.log("-- 2", meta.registrarAvanco(-20), meta.registrarAvanco(900), meta.getMinutosCumpridos(), meta.registrarAvanco(60), meta.calcularPercentual() + "%");
  console.log("-- 3");
  try { new Usuario(0, "x", "x", "x"); } catch (e) { console.log("bloqueado:", e.message); }
  const admin = new Administrador(1, "Coordenação PI", "coord@fecap.br", "a", "Coordenação PI");
  const resp = new Responsavel(2, "Carlos", "carlos@email.com", "r", "Pai");
  const lucas = new Discente(3, "Lucas Silva", "lucas@fecap.br", "d", "RA-101");
  [admin, resp, lucas].forEach((u) => console.log(u.obterTipoPerfil(), "->", u.gerarPainelResumo()));
  console.log("-- 4");
  const sessoes = [new SessaoPomodoro(poo, 25, 1), new SessaoExercicios(bd, 40, 10, 8), new SessaoLeitura(es, 30, 12, true)];
  let xp = 0; for (const s of sessoes) { console.log(s.gerarFeedback()); xp += s.calcularXp(); }
  console.log("XP total:", xp);
  console.log("-- 5");
  lucas.registrarEstudo(sessoes[0]); lucas.registrarEstudo(poo, 50); lucas.registrarEstudo(es, 14, 16, 20);
  lucas.getHistorico().forEach((s) => console.log(s.gerarFeedback())); console.log(lucas.gerarPainelResumo());
  console.log("-- 6", sessoes[0].paraJson(), meta.paraJson());
  console.log("-- 7", resp.vincularDiscente(lucas), resp.vincularDiscente(lucas), resp.gerarPainelResumo());
  const trilha = new TrilhaEstudo("Trilha ADS", admin); [poo, bd, es].forEach((d) => trilha.adicionarDisciplina(d));
  console.log(trilha.getTitulo(), trilha.calcularCargaHorariaTotal() + "h/semana");
  console.log("-- 8");
  const plano = new PlanoEstudo(); plano.adicionarItem("Segunda", 60); plano.adicionarItem("Quarta", 90);
  console.log(plano.listarResumo(), plano.calcularTotalMinutos() + " min");
  const servico = new ServicoAlertaResponsavel();
  servico.avaliarDiscente(lucas, meta, resp, new NotificadorEmail());
  servico.avaliarDiscente(lucas, meta, resp, new NotificadorWhatsApp());
  meta.registrarAvanco(60);
  servico.avaliarDiscente(lucas, meta, resp, new NotificadorPainel());
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", iniciarTela);
else demo();
if (typeof module !== "undefined") module.exports = { Disciplina, MetaEstudo, Discente, Responsavel, SessaoPomodoro, SessaoExercicios, SessaoLeitura, ClienteBackendEstudo };
