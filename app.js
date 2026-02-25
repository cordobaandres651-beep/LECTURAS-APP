// ====== CONFIG ======
console.log("APP CARGÓ");
alert("APP CARGÓ");
const API_URL = "https://script.google.com/macros/s/AKfycbzjGTkCzQ_Iv2-VnGWrGJyNCeD5puiG9lk_s8ydZ26iy-56oZrazCCO6U0Kdct4RllL/exec";
const STORAGE_KEY = "lecturas_app_state_v1";
document.getElementById("formLogin").addEventListener("submit", (e) => {
  e.preventDefault(); // evita que recargue la página
  // aquí llamas tu función de login
});
// Anomalías (código + descripción)
const ANOMALIAS = [
  "1 - Predio No Existe",
  "2 - Alto Riesgo Subestación",
  "4 - Predio Demolido O Abandonado",
  "5 - Usuario Impide Toma De Lectura",
  "6 - Predio Desocupado Con Lectura",
  "7 - Extremadamente Alto",
  "8 - Predio Desocupado Sin Lectura",
  "9 - Doble Matricula Con CEDENAR",
  "10 - Medidor Inexistente O Desconectado",
  "11 - Medidor No Registrado",
  "13 - Medidor Volteado o Descolgado",
  "15 - Posible Irregularidad",
  "16 - Medidor Dañado",
  "17 - Sin Sellos En La Tapa Principal",
  "18 - Display Apagado o Desprogramado",
  "19 - Registrador No Visible",
  "20 - Cifras Del Medidor No Corresponden",
  "21 - Medidor Desconectado Sin Servicio",
  "22 - Reloj Desconectado Dañado",
  "23 - Servicio Suspendido Con Medidor",
  "24 - Servicio Suspendido Sin Medidor",
  "25 - Dirección Incorrecta",
  "26 - Medidor Mec. Desconectado",
  "30 - Desastre Natural",
  "31 - Zona En Conflicto",
  "32 - No Hay Acceso al Medidor",
  "33 - Doble Matricula Con Otro Comercializador",
  "34 - Derivación Antes del Medidor",
  "35 - Puente En La Bornera",
  "36 - Medidor No Registra Consumo",
  "37 - Sin Sellos En La Tapa Bornera"
];

// ====== UI ======
const el = (id) => document.getElementById(id);

const loginView = el("loginView");
const appView = el("appView");
const loginMsg = el("loginMsg");
const whoami = el("whoami");
const syncMsg = el("syncMsg");
const formCard = el("formCard");
const formMsg = el("formMsg");
const listDiv = el("list");
const netStatus = el("netStatus");

// Inputs
const loginUser = el("loginUser");
const loginPin = el("loginPin");

const codigo = el("codigo");
const lecturaActiva = el("lecturaActiva");
const lecturaReactiva = el("lecturaReactiva");
const anomSelect = el("anomSelect");
const anomList = el("anomList");
const observacion = el("observacion");

const fotoPredio = el("fotoPredio");
const fotoL1 = el("fotoL1");
const fotoL2 = el("fotoL2");
const fotoAnexos = el("fotoAnexos");

const predioPreview = el("predioPreview");
const l1Preview = el("l1Preview");
const l2Preview = el("l2Preview");
const anexosPreview = el("anexosPreview");

// Buttons
el("btnLogin").onclick = onLogin;
el("btnLogout").onclick = onLogout;
el("btnNew").onclick = () => showForm(true);
el("btnCancel").onclick = () => showForm(false);
el("btnSaveOffline").onclick = saveOffline;
el("btnSync").onclick = syncPending;
el("btnAddAnom").onclick = addAnom;
el("btnClearAnom").onclick = clearAnoms;

// Service worker for install/offline shell
//if ("serviceWorker" in navigator) {
  ///navigator.serviceWorker.register("./sw.js");
//}

// ====== State ======
let state = loadState();
renderNet();
window.addEventListener("online", renderNet);
window.addEventListener("offline", renderNet);

// Populate anomalies selector
for (const a of ANOMALIAS) {
  const opt = document.createElement("option");
  opt.value = a;
  opt.textContent = a;
  anomSelect.appendChild(opt);
}

// Photo previews
wirePreview(fotoPredio, predioPreview);
wirePreview(fotoL1, l1Preview);
wirePreview(fotoL2, l2Preview);
wirePreview(fotoAnexos, anexosPreview);

// Boot
render();

// ====== Functions ======
function render() {
  if (!state.session) {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    return;
  }
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  whoami.textContent = 'Responsable: ${state.session.user}';
  showForm(false);
  renderList();
}

function renderNet() {
  const online = navigator.onLine;
  netStatus.textContent = online ? "Con internet" : "Sin internet";
  netStatus.className = "pill " + (online ? "ok" : "danger");
}

function onLogin() {
  const user = (loginUser.value || "").trim().toUpperCase();
  const pin = (loginPin.value || "").trim();
  if (!user || !pin) {
    loginMsg.textContent = "Ingresa usuario y PIN.";
    loginMsg.className = "danger";
    return;
  }
  // No validamos aquí contra USERS para no exponer la lista.
  // El backend validará al sincronizar.
  state.session = { user, pin };
  saveState();
  loginMsg.textContent = "";
  render();
}

function onLogout() {
  state.session = null;
  saveState();
  render();
}

function showForm(show) {
  formCard.classList.toggle("hidden", !show);
  if (show) resetForm();
}

function resetForm() {
  codigo.value = "";
  lecturaActiva.value = "";
  lecturaReactiva.value = "";
  observacion.value = "";
  state.draftAnoms = [];
  renderAnoms();
  fotoPredio.value = "";
  fotoL1.value = "";
  fotoL2.value = "";
  fotoAnexos.value = "";
  predioPreview.innerHTML = "";
  l1Preview.innerHTML = "";
  l2Preview.innerHTML = "";
  anexosPreview.innerHTML = "";
  formMsg.textContent = "";
}

function addAnom() {
  const v = anomSelect.value;
  if (!v) return;
  state.draftAnoms = state.draftAnoms || [];
  if (!state.draftAnoms.includes(v)) state.draftAnoms.push(v);
  renderAnoms();
  saveState();
}

function clearAnoms() {
  state.draftAnoms = [];
  renderAnoms();
  saveState();
}

function renderAnoms() {
  anomList.innerHTML = "";
  const arr = state.draftAnoms || [];
  for (const a of arr) {
    const li = document.createElement("li");
    li.textContent = a;
    anomList.appendChild(li);
  }
}

function wirePreview(fileInput, container) {
  fileInput.addEventListener("change", async () => {
    container.innerHTML = "";
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = document.createElement("img");
    img.src = url;
    img.className = "thumb";
    container.appendChild(img);
  });
}

// Compress image to reduce payload (keeps it basic)
async function fileToBase64Compressed(file, maxW = 1280, quality = 0.75) {
  const img = await loadImage(file);
  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  // JPEG base64 without header
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl; // keep data:image/... prefix; backend strips it too
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function validateForm() {
  const c = (codigo.value || "").trim();
  if (!/^\d+$/.test(c)) return "Código interno debe ser numérico.";
  if (!(lecturaActiva.value || "").trim()) return "Lectura activa es obligatoria.";
  if (!(lecturaReactiva.value || "").trim()) return "Lectura reactiva es obligatoria.";
  if (!state.draftAnoms || state.draftAnoms.length < 1) return "Debes seleccionar al menos 1 anomalía.";
  if (!(observacion.value || "").trim()) return "Observación es obligatoria.";
  if (!fotoPredio.files[0]) return "Falta foto predio.";
  if (!fotoL1.files[0]) return "Falta foto lectura/anomalía 1.";
  if (!fotoL2.files[0]) return "Falta foto lectura/anomalía 2.";
  if (!fotoAnexos.files[0]) return "Falta foto anexos.";
  return null;
}

async function saveOffline() {
  const err = validateForm();
  if (err) {
    formMsg.textContent = err;
    formMsg.className = "danger";
    return;
  }

  const rec = await buildRecordFromForm();
  state.pending.unshift(rec);
  saveState();
  showForm(false);
  renderList();

  syncMsg.textContent = "Guardado como pendiente en el teléfono.";
  syncMsg.className = "ok";
}

async function buildRecordFromForm() {
  const session = state.session;
  const c = (codigo.value || "").trim();
  const rec = {na
    local_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    codigo_interno: c,
    lectura_activa: (lecturaActiva.value || "").trim(),
    lectura_reactiva: (lecturaReactiva.value || "").trim(),
    anomalías: [...(state.draftAnoms || [])],
    observación: (observacion.value || "").trim(),
    // photos as base64 (compressed)
    foto_predio_b64: await fileToBase64Compressed(fotoPredio.files[0]),
    foto_lectura1_b64: await fileToBase64Compressed(fotoL1.files[0]),
    foto_lectura2_b64: await fileToBase64Compressed(fotoL2.files[0]),
    foto_anexos_b64: await fileToBase64Compressed(fotoAnexos.files[0]),
    status: "PENDIENTE",
    pdf_url: null,
    server_id: null,
    responsable: session.user
  };
  return rec;
}

function renderList() {
  state.pending = state.pending || [];
  state.sent = state.sent || [];

  const items = [
    ...state.pending.map(r => ({...r, _bucket:"PENDIENTE"})),
    ...state.sent.map(r => ({...r, _bucket:"ENVIADO"}))
  ];

  listDiv.innerHTML = "";
  if (items.length === 0) {
    listDiv.innerHTML = <div class="muted">Aún no hay registros.</div>;
    return;
  }

  for (const r of items) {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("div");
    title.innerHTML = '<b>${r.codigo_interno}</b> <span class="pill">${r._bucket}</span> <span class="muted">(${r.responsable})</span>';
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "muted";
    meta.textContent = new Date(r.created_at).toLocaleString();
    card.appendChild(meta);

    const an = document.createElement("div");
    an.innerHTML = '<div class="muted">Anomalías:</div><ul class="list">${(r["anomalías"]||[]).map(x=><li>${escapeHtml(x)}</li>).join("")}</ul>';
    card.appendChild(an);

    const row = document.createElement("div");
    row.className = "row";
    row.style.marginTop = "10px";

    if (r._bucket === "PENDIENTE") {
      const b1 = document.createElement("button");
      b1.className = "btn2";
      b1.textContent = "Eliminar";
      b1.onclick = () => deletePending(r.local_id);
      row.appendChild(b1);
    } else {
      const b2 = document.createElement("button");
      b2.className = "btn3";
      b2.textContent = "Ver PDF";
      b2.onclick = () => window.open(r.pdf_url, "_blank");
      row.appendChild(b2);
    }

    card.appendChild(row);
    listDiv.appendChild(card);
  }
}

function deletePending(localId) {
  state.pending = (state.pending || []).filter(x => x.local_id !== localId);
  saveState();
  renderList();
}

async function syncPending() {
  if (!navigator.onLine) {
    syncMsg.textContent = "No hay internet. Conéctate y vuelve a intentar.";
    syncMsg.className = "danger";
    return;
  }
  if (!state.session) return;

  state.pending = state.pending || [];
  if (state.pending.length === 0) {
    syncMsg.textContent = "No hay pendientes por enviar.";
    syncMsg.className = "muted";
    return;
  }

  syncMsg.textContent = 'Enviando ${state.pending.length} pendiente(s)...';
  syncMsg.className = "muted";

  const stillPending = [];
  for (const rec of state.pending) {
    try {
      const payload = {
        user: state.session.user,
        pin: state.session.pin,
        codigo_interno: rec.codigo_interno,
        lectura_activa: rec.lectura_activa,
        lectura_reactiva: rec.lectura_reactiva,
        "anomalías": rec["anomalías"],
        "observación": rec["observación"],
        foto_predio_b64: rec.foto_predio_b64,
        foto_lectura1_b64: rec.foto_lectura1_b64,
        foto_lectura2_b64: rec.foto_lectura2_b64,
        foto_anexos_b64: rec.foto_anexos_b64
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");

      rec.status = "ENVIADO";
      rec.pdf_url = data.pdf_url;
      rec.server_id = data.id;

      state.sent.unshift(rec);
      saveState();

    } catch (e) {
      stillPending.push(rec);
      console.error(e);
    }
  }

  state.pending = stillPending;
  saveState();
  renderList();

  if (stillPending.length === 0) {
    syncMsg.textContent = "Listo: todo enviado y PDF generado.";
    syncMsg.className = "ok";
  } else {
    syncMsg.textContent = 'Se enviaron algunos. Quedaron ${stillPending.length} pendientes (revisa conexión o PIN).';
    syncMsg.className = "danger";
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const s = raw ? JSON.parse(raw) : null;
  return s || { session: null, pending: [], sent: [], draftAnoms: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}



