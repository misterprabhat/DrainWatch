const STORAGE_KEY = "drainwatch_mohali_v6";
const appState = {
  hotspots: [],
  currentFilter: "all",
  map: null,
  markerLayer: null,
};
const DEMO_REPORTS = [
  {
    id: "moh-3b2",
    title: "Litter near a street drain",
    phase: "Phase 3B2 Market",
    filterTag: "Phase 3B2",
    lat: 30.7188,
    lng: 76.7082,
    severity: "critical",
    blockagePct: 84,
    notes:
      "Litter gathered near a street drain; please check the location in person.",
    timestamp: "1 hour ago · By Resident",
    status: "needs_action",
  },
  {
    id: "moh-5",
    title: "Leaves around drain cover",
    phase: "Phase 5 Market",
    filterTag: "Phase 5",
    lat: 30.7112,
    lng: 76.7191,
    severity: "moderate",
    blockagePct: 48,
    notes: "Leaves collecting around the drain cover.",
    timestamp: "3 hours ago · By Community",
    status: "needs_action",
  },
  {
    id: "moh-7",
    title: "Drain marked clear",
    phase: "Phase 7 Market",
    filterTag: "Phase 7",
    lat: 30.7042,
    lng: 76.7163,
    severity: "clear",
    blockagePct: 0,
    notes: "Drain checked and found clear.",
    timestamp: "5 hours ago · By Scout Action",
    status: "cleared",
  },
];
const AREA = {
  "Phase 3B2 Market": { lat: 30.7188, lng: 76.7082, tag: "Phase 3B2" },
  "Phase 5 Market": { lat: 30.7112, lng: 76.7191, tag: "Phase 5" },
  "Phase 7 Market": { lat: 30.7042, lng: 76.7163, tag: "Phase 7" },
  "Sector 70, Mohali": { lat: 30.6975, lng: 76.735, tag: "Sector 70" },
  "Sector 69, Mohali": { lat: 30.6948, lng: 76.7312, tag: "Sector 69" },
  "Sohana / Sector 77": { lat: 30.6748, lng: 76.7205, tag: "Sector 77" },
  Balongi: { lat: 30.687, lng: 76.704, tag: "Balongi" },
  Kumbra: { lat: 30.701, lng: 76.708, tag: "Kumbra" },
  "Other area in Mohali": { lat: 30.708, lng: 76.718, tag: "Other" },
};
function switchView(viewId) {
  document
    .getElementById("dashboard-view")
    .classList.toggle("hidden", viewId !== "dashboard-view");
  document
    .getElementById("greywater-view")
    .classList.toggle("hidden", viewId !== "greywater-view");
  document
    .querySelectorAll("[data-view]")
    .forEach((b) =>
      b.classList.toggle("active-nav", b.dataset.view === viewId),
    );
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (viewId === "dashboard-view" && appState.map)
    setTimeout(() => appState.map.invalidateSize(), 160);
}
let toastTimer;
function triggerToast(message, success = true) {
  const toast = document.getElementById("app-toast");
  document.getElementById("toast-text").textContent = message;
  document.getElementById("toast-icon").className = success
    ? "ph-fill ph-check-circle"
    : "ph-fill ph-warning-circle";
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
function init() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    appState.hotspots = saved
      ? JSON.parse(saved)
      : DEMO_REPORTS.map((x) => ({ ...x }));
  } catch (e) {
    appState.hotspots = DEMO_REPORTS.map((x) => ({ ...x }));
  }
  initMap();
  updateMetrics();
  renderHotspotList();
  updateWaterEstimate(20);
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.hotspots));
  } catch (e) {
    console.warn("Local storage is unavailable", e);
  }
}
function initMap() {
  if (!window.L) return;
  appState.map = L.map("mohali-map", {
    zoomControl: false,
    scrollWheelZoom: false,
    attributionControl: true,
  }).setView([30.708, 76.718], 12);
  L.control.zoom({ position: "topright" }).addTo(appState.map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap",
  }).addTo(appState.map);
  appState.markerLayer = L.layerGroup().addTo(appState.map);
  renderMapMarkers();
}
function renderMapMarkers() {
  if (!appState.markerLayer) return;
  appState.markerLayer.clearLayers();
  appState.hotspots.forEach((s) => {
    const color =
      s.status === "cleared"
        ? "#29986c"
        : s.severity === "critical"
          ? "#db715e"
          : s.severity === "moderate"
            ? "#d5a13c"
            : "#29986c";
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:15px;height:15px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px ${color}88"></div>`,
      iconSize: [15, 15],
      iconAnchor: [7, 7],
    });
    L.marker([s.lat, s.lng], { icon })
      .bindPopup(
        `<strong>${escapeHTML(s.title)}</strong><br>${escapeHTML(s.phase)}<br><small>${s.blockagePct}% estimated concern</small>`,
      )
      .addTo(appState.markerLayer);
  });
}
function centerMohali() {
  if (appState.map) appState.map.setView([30.708, 76.718], 12);
}
function focusOnMap(lat, lng) {
  if (appState.map) {
    appState.map.setView([lat, lng], 15, { animate: true });
    document
      .getElementById("mohali-map")
      .scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
function escapeHTML(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function handleReportSubmission(e) {
  e.preventDefault();
  const phase = document.getElementById("form-phase").value;
  const landmark = document.getElementById("form-landmark").value.trim();
  const issue =
    document.querySelector('input[name="issue"]:checked')?.value ||
    "Blocked drain";
  const notes = document.getElementById("form-notes").value.trim();
  if (!landmark) {
    triggerToast("Please add a nearby landmark.", false);
    return;
  }
  const area = AREA[phase] || AREA["Other area in Mohali"];
  const severity =
    issue === "Blocked drain" || issue === "Water standing"
      ? "moderate"
      : "moderate";
  const blocked =
    issue === "Blocked drain"
      ? 55
      : issue === "Water standing"
        ? 45
        : issue === "Damaged cover"
          ? 35
          : 25;
  appState.hotspots.unshift({
    id: "local-" + Date.now(),
    title: `${issue} — ${landmark}`,
    phase,
    filterTag: area.tag,
    lat: area.lat + (Math.random() - 0.5) * 0.001,
    lng: area.lng + (Math.random() - 0.5) * 0.001,
    severity,
    blockagePct: blocked,
    notes: notes || `${issue} reported by a resident.`,
    timestamp: "Just now",
    status: "needs_action",
  });
  persist();
  updateMetrics();
  renderHotspotList();
  renderMapMarkers();
  document.getElementById("report-form").reset();
  triggerToast("Report added to the community list.");
}
function handleFilterChange(value) {
  appState.currentFilter = value;
  renderHotspotList();
}
function renderHotspotList() {
  const container = document.getElementById("hotspot-list");
  if (!container) return;
  const items = appState.hotspots.filter(
    (s) =>
      appState.currentFilter === "all" ||
      s.filterTag === appState.currentFilter,
  );
  if (!items.length) {
    container.innerHTML =
      '<div class="empty-state">No reports for this filter.</div>';
    return;
  }
  container.innerHTML = items
    .map((s) => {
      const cleared = s.status === "cleared";
      const badge = cleared
        ? '<span class="spot-badge badge-clear">Marked clear</span>'
        : s.severity === "critical"
          ? '<span class="spot-badge badge-critical">Needs attention</span>'
          : '<span class="spot-badge badge-moderate">Check needed</span>';
      const actions = cleared
        ? '<span class="spot-sub">Status updated</span>'
        : `<div class="spot-actions"><button class="mini-button" onclick="markSpotCleared('${s.id}')">Mark clear</button><button class="mini-button primary" onclick="focusOnMap(${s.lat},${s.lng})">View map</button></div>`;
      return `<article class="spot-card"><div class="spot-top"><div><div class="spot-title">${escapeHTML(s.title)}</div><div class="spot-sub">${escapeHTML(s.phase)} · ${escapeHTML(s.timestamp)}</div></div>${badge}</div><div class="spot-bottom"><small>${s.blockagePct}% estimated concern</small>${actions}</div></article>`;
    })
    .join("");
}
function updateMetrics() {
  document.getElementById("stat-critical").textContent =
    appState.hotspots.filter(
      (s) => s.status !== "cleared" && s.severity !== "clear",
    ).length;
  document.getElementById("stat-cleared").textContent =
    appState.hotspots.filter((s) => s.status === "cleared").length;
}
function markSpotCleared(id) {
  const spot = appState.hotspots.find((s) => s.id === id);
  if (!spot) return;
  spot.status = "cleared";
  spot.severity = "clear";
  spot.blockagePct = 0;
  persist();
  updateMetrics();
  renderHotspotList();
  renderMapMarkers();
  triggerToast("Report marked as clear.");
}
function resetData() {
  appState.hotspots = DEMO_REPORTS.map((x) => ({ ...x }));
  persist();
  updateMetrics();
  renderHotspotList();
  renderMapMarkers();
  centerMohali();
  triggerToast("Reports have been reset.");
}
const REUSE_CONTENT = {
  plants: {
    number: "01",
    title: "Water ornamental plants",
    text: "Use suitable greywater promptly and apply it to the soil around established ornamental plants, not directly onto leaves. Avoid pooling and check that your detergent is plant-friendly.",
    tip: "Keep the water below the leaves and let it soak into the soil. Do not use greywater on edible leaves or root vegetables.",
  },
  laundry: {
    number: "02",
    title: "Reuse laundry water carefully",
    text: "If collecting rinse water, start with a small, supervised container and use only water from a suitable wash cycle. Keep children and pets away from stored water and do not alter plumbing without qualified advice.",
    tip: "Choose low-sodium, plant-friendly detergent. Do not collect water that contains bleach, harsh cleaners, or strong disinfectants.",
  },
  cleaning: {
    number: "03",
    title: "Use it for suitable outdoor cleaning",
    text: "Some lightly used water may be suitable for washing outdoor hard surfaces when local rules allow. Avoid letting it run into storm drains, ponds, or neighbouring properties.",
    tip: "Never use greywater for drinking, cooking, bathing, or cleaning food-contact surfaces. If it smells unusual or contains harsh products, dispose of it safely.",
  },
};
function selectReuse(key, button) {
  const item = REUSE_CONTENT[key];
  if (!item) return;
  document
    .querySelectorAll(".reuse-card")
    .forEach((el) => el.classList.toggle("selected", el === button));
  document.querySelector(".detail-number").textContent = item.number;
  document.getElementById("reuse-detail-title").textContent = item.title;
  document.getElementById("reuse-detail-text").textContent = item.text;
  document.getElementById("reuse-detail-tip").textContent = item.tip;
}
function updateWaterEstimate(value) {
  const litres = Number(value) || 0;
  document.getElementById("litre-value").textContent = litres;
  document.getElementById("weekly-value").innerHTML =
    `${litres * 7} <span>L</span>`;
  document.getElementById("monthly-value").innerHTML =
    `${litres * 30} <span>L</span>`;
  const slider = document.getElementById("water-litres");
  if (slider)
    slider.style.background = `linear-gradient(90deg,#17845b ${litres}%,#e1eee5 ${litres}%)`;
}
window.addEventListener("DOMContentLoaded", init);
