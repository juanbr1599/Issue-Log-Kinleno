const STORAGE_KEY = "maintenance_log_records_v1";

const equipment = document.getElementById("equipment");
const activity = document.getElementById("activity");
const notes = document.getElementById("notes");
const statusInput = document.getElementById("status");
const startDisplay = document.getElementById("startDisplay");
const endDisplay = document.getElementById("endDisplay");
const durationDisplay = document.getElementById("durationDisplay");
const startBtn = document.getElementById("startBtn");
const finishBtn = document.getElementById("finishBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const logList = document.getElementById("logList");
const search = document.getElementById("search");
const filterStatus = document.getElementById("filterStatus");
const installBtn = document.getElementById("installBtn");

let activeStart = null;
let deferredPrompt = null;

function getRecords() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function durationMinutes(start, end) {
  return Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
}

function resetForm() {
  activeStart = null;
  startDisplay.textContent = "--:--";
  endDisplay.textContent = "--:--";
  durationDisplay.textContent = "0 min";
  startBtn.disabled = false;
  finishBtn.disabled = true;
}

function clearInputs() {
  equipment.value = "";
  activity.value = "";
  notes.value = "";
  statusInput.value = "Abierto";
  resetForm();
}

function renderRecords() {
  const records = getRecords();
  const term = search.value.toLowerCase().trim();
  const statusFilter = filterStatus.value;

  const filtered = records.filter(r => {
    const matchesText =
      r.equipment.toLowerCase().includes(term) ||
      r.activity.toLowerCase().includes(term) ||
      r.notes.toLowerCase().includes(term);
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesText && matchesStatus;
  });

  if (!filtered.length) {
    logList.innerHTML = `<div class="empty">No hay registros todavía.</div>`;
    return;
  }

  logList.innerHTML = filtered.map(r => `
    <article class="log-item">
      <div class="log-top">
        <div>
          <div class="log-title">${escapeHtml(r.activity || "Sin actividad")}</div>
          <div class="log-meta">${escapeHtml(r.equipment || "Sin equipo")}</div>
        </div>
        <span class="badge">${escapeHtml(r.status)}</span>
      </div>
      <div class="log-meta">
        ${formatDate(r.start)} · ${formatTime(r.start)} - ${formatTime(r.end)} · ${r.duration} min
      </div>
      ${r.notes ? `<p>${escapeHtml(r.notes)}</p>` : ""}
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

startBtn.addEventListener("click", () => {
  activeStart = new Date().toISOString();
  startDisplay.textContent = formatTime(activeStart);
  endDisplay.textContent = "--:--";
  durationDisplay.textContent = "En curso";
  startBtn.disabled = true;
  finishBtn.disabled = false;
});

finishBtn.addEventListener("click", () => {
  if (!activeStart) return;

  const end = new Date().toISOString();
  const record = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    equipment: equipment.value.trim(),
    activity: activity.value.trim(),
    notes: notes.value.trim(),
    status: statusInput.value,
    start: activeStart,
    end,
    duration: durationMinutes(activeStart, end)
  };

  const records = getRecords();
  records.unshift(record);
  saveRecords(records);

  endDisplay.textContent = formatTime(end);
  durationDisplay.textContent = `${record.duration} min`;

  clearInputs();
  renderRecords();
});

clearBtn.addEventListener("click", clearInputs);

deleteAllBtn.addEventListener("click", () => {
  if (confirm("¿Seguro que quieres borrar todos los registros?")) {
    localStorage.removeItem(STORAGE_KEY);
    renderRecords();
  }
});

exportBtn.addEventListener("click", () => {
  const records = getRecords();
  if (!records.length) {
    alert("No hay registros para exportar.");
    return;
  }

  const headers = ["Fecha", "Equipo", "Actividad", "Inicio", "Fin", "Duracion_min", "Estado", "Notas"];
  const rows = records.map(r => [
    formatDate(r.start),
    r.equipment,
    r.activity,
    formatTime(r.start),
    formatTime(r.end),
    r.duration,
    r.status,
    r.notes
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `maintenance-log-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

search.addEventListener("input", renderRecords);
filterStatus.addEventListener("change", renderRecords);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

renderRecords();
