const API_URL = "https://script.google.com/macros/s/AKfycbzjGTkCzQ_Iv2-VnGWrGJyNCeD5puiG9lk_s8ydZ26iy-56oZrazCCO6U0Kdct4RllL/exec";
const STORAGE_KEY = "lecturas_app_state_no_login_v3";

const ANOMALIAS = [
  "1 - Predio No Existe","2 - Alto Riesgo Subestación","4 - Predio Demolido O Abandonado",
  "5 - Usuario Impide Toma De Lectura","6 - Predio Desocupado Con Lectura","7 - Extremadamente Alto",
  "8 - Predio Desocupado Sin Lectura","9 - Doble Matricula Con CEDENAR","10 - Medidor Inexistente O Desconectado",
  "11 - Medidor No Registrado","13 - Medidor Volteado o Descolgado","15 - Posible Irregularidad",
  "16 - Medidor Dañado","17 - Sin Sellos En La Tapa Principal","18 - Display Apagado o Desprogramado",
  "19 - Registrador No Visible","20 - Cifras Del Medidor No Corresponden","21 - Medidor Desconectado Sin Servicio",
  "22 - Reloj Desconectado Dañado","23 - Servicio Suspendido Con Medidor","24 - Servicio Suspendido Sin Medidor",
  "25 - Dirección Incorrecta","26 - Medidor Mec. Desconectado","30 - Desastre Natural","31 - Zona En Conflicto",
  "32 - No Hay Acceso al Medidor","33 - Doble Matricula Con Otro Comercializador","34 - Derivación Antes del Medidor",
  "35 - Puente En La Bornera","36 - Medidor No Registra Consumo","37 - Sin Sellos En La Tapa Bornera"
];

const el = (id) => document.getElementById(id);

const netStatus = el("netStatus");
const syncMsg = el("syncMsg");
const formCard = el("formCard");
const formMsg = el("formMsg");
const listDiv = el("list");

const responsableSelect = el("responsableSelect");
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

el("btnNew").addEventListener("click", () => showForm(true));
el("btnCancel").addEventListener("click", () => showForm(false));
el("btnSaveOffline").addEventListener("click", saveOffline);
el("btnSync").addEventListener("click", syncPending);
el("btnAddAnom").addEventListener("click", addAnom);
el("btnClearAnom").addEventListener("click", clearAnoms);

let state = loadState();

renderNet();
window.addEventListener("online", renderNet);
window.addEventListener("offline", renderNet);

for (const a of ANOMALIAS) {
  const opt = document.createElement("option");
  opt.value = a;
  opt.textContent = a;
  anomSelect.appendChild(opt);
}

wirePreview(fotoPredio, predioPreview);
wirePreview(fotoL1, l1Preview);
wirePreview(fotoL2, l2Preview);
wirePreview(fotoAnexos, anexosPreview);

showForm(false);
renderList();

function renderNet() {
  const online = navigator.onLine;
  netStatus.textContent = online ? "Con internet" : "Sin internet";
  netStatus.className = "pill " + (online ? "ok" : "danger");
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
  formMsg.className = "muted";
  saveState();
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
  for (const a of (state.draftAnoms || [])) {
    const li = document.createElement("li");
    li.textContent = a;
    anomList.appendChild(li);
  }
}

function wirePreview(fileInput, container) {
  fileInput.addEventListener("change", () => {
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

function validateForm() {
  if (!responsableSelect.value) return "Responsable es obligatorio.";
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

async function fileToBase64Compressed(file, maxW = 1280, quality = 0.75) {
  const img = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });

  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

async function saveOffline() {
  const err = validateForm();
  if (err) {
    formMsg.textContent = err;
    formMsg.className = "danger";
    return;
  }

  const rec = {
    local_id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    created_at: new Date().toISOString(),
    responsable: responsableSelect.value.trim().toUpperCase(),
    codigo_interno: (codigo.value || "").trim(),
    lectura_activa: (lecturaActiva.value || "").trim(),
    lectura_reactiva: (lecturaReactiva.value || "").trim(),
    anomalías: [...(state.draftAnoms || [])],
    observación: (observacion.value || "").trim(),
    foto_predio_b64: await fileToBase64Compressed(fotoPredio.files[0]),
    foto_lectura1_b64: await fileToBase64Compressed(fotoL1.files[0]),
    foto_lectura2_b64: await fileToBase64Compressed(fotoL2.files[0]),
    foto_anexos_b64: await fileToBase64Compressed(fotoAnexos.files[0]),
    status: "PENDIENTE",
    pdf_url: null,
    server_id: null
  };

  state.pending = state.pending || [];
  state.pending.unshift(rec);
  saveState();

  showForm(false);
  renderList();

  syncMsg.textContent = "Guardado como pendiente en el teléfono.";
  syncMsg.className = "ok";
}

function renderList() {
  const pending = state.pending || [];
  const sent = state.sent || [];
  const items = [
    ...pending.map(r => ({...r, _bucket:"PENDIENTE"})),
    ...sent.map(r => ({...r, _bucket:"ENVIADO"}))
  ];

  listDiv.innerHTML = "";
  if (items.length === 0) {
    listDiv.innerHTML = <div class="muted">Aún no hay registros.</div>;
    return;
  }

  for (const r of items) {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div><b>${escapeHtml(r.codigo_interno)}</b> <span class="pill">${r._bucket}</span> <span class="muted">(${escapeHtml(r.responsable)})</span></div>
      <div class="muted">${new Date(r.created_at).toLocaleString()}</div>
      <div class="muted">Anomalías:</div>
      <ul class="list">${(r["anomalías"]||[]).map(x => <li>${escapeHtml(x)}</li>).join("")}</ul>
    `;

    const row = document.createElement("div");
    row.className = "row";
    row.style.marginTop = "10px";

    if (r._bucket === "PENDIENTE") {
      const b = document.createElement("button");
      b.className = "btn2";
      b.textContent = "Eliminar";
      b.type = "button";
      b.onclick = () => {
        state.pending = (state.pending || []).filter(x => x.local_id !== r.local_id);
        saveState();
        renderList();
      };
      row.appendChild(b);
    } else {
      const b = document.createElement("button");
      b.className = "btn3";
      b.textContent = "Ver PDF";
      b.type = "button";
      b.onclick = () => window.open(r.pdf_url, "_blank");
      row.appendChild(b);
    }

    card.appendChild(row);
    listDiv.appendChild(card);
  }
}

async function syncPending() {
  if (!navigator.onLine) {
    syncMsg.textContent = "No hay internet. Conéctate y vuelve a intentar.";
    syncMsg.className = "danger";
    return;
  }

  state.pending = state.pending || [];
  if (state.pending.length === 0) {
    syncMsg.textContent = "No hay pendientes por enviar.";
    syncMsg.className = "muted";
    return;
  }

  syncMsg.textContent = Enviando ${state.pending.length} pendiente(s)...;
  syncMsg.className = "muted";

  const stillPending = [];
  for (const rec of state.pending) {
    try {
      const payload = {
        responsable: rec.responsable,
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
      if (!data.ok) throw new Error(data.error || "Error");

      rec.status = "ENVIADO";
      rec.pdf_url = data.pdf_url;
      rec.server_id = data.id;

      state.sent = state.sent || [];
      state.sent.unshift(rec);
      saveState();
    } catch (e) {
      stillPending.push(rec);
    }
  }

  state.pending = stillPending;
  saveState();
  renderList();

  if (stillPending.length === 0) {
    syncMsg.textContent = "Listo: todo enviado y PDF generado.";
    syncMsg.className = "ok";
  } else {
    syncMsg.textContent = Quedaron ${stillPending.length} pendientes.;
    syncMsg.className = "danger";
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { pending: [], sent: [], draftAnoms: [] };
  } catch {
    return { pending: [], sent: [], draftAnoms: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
