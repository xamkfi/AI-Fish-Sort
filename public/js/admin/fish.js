"use strict";

const API_BASE_URL = window.location.origin;
const fishCache = new Map();
let editFishModal = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value) {
  if (!value) {
    return "Ei tiedossa";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ei tiedossa";
  }

  return date.toLocaleString("fi-FI", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchCsrfToken() {
  const response = await fetch(`${API_BASE_URL}/admin/csrf-token`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("CSRF-tokenin haku epaonnistui.");
  }

  const data = await response.json();
  if (!data.csrfToken) {
    throw new Error("CSRF-token puuttuu vastauksesta.");
  }

  return data.csrfToken;
}

function showFishMessage(message, type) {
  const messageElement = document.getElementById("fishMessage");
  if (!messageElement) {
    return;
  }

  messageElement.innerHTML = `<div class="alert alert-${type} mb-0">${escapeHtml(message)}</div>`;
}

function showEditFishMessage(message, type) {
  const messageElement = document.getElementById("editFishMessage");
  if (!messageElement) {
    return;
  }

  messageElement.innerHTML = `<div class="alert alert-${type} mb-0">${escapeHtml(message)}</div>`;
}

function renderFishCard(species) {
  const sciName = species.scientificName
    ? escapeHtml(species.scientificName)
    : null;
  return `
    <div class="col-md-6 col-xl-4">
      <div class="card h-100 shadow-sm border-0">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-3 gap-3">
            <div>
              <h5 class="card-title mb-1">${escapeHtml(species.finnishName)}</h5>
              ${sciName ? `<div class="text-muted small fst-italic">${sciName}</div>` : '<div class="text-muted small">Kalalaji</div>'}
            </div>
            <span class="badge text-bg-primary">Species</span>
          </div>

          <p class="card-text text-muted flex-grow-1">
            Tata kalalajia voidaan kayttaa havaintojen speciesId-arvona.
          </p>

          <div class="rounded bg-light border p-3 small mt-3">
            <div class="mb-2">
              <div class="fw-bold text-muted text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.05em;">ID</div>
              <code class="text-break">${escapeHtml(species.id)}</code>
            </div>
            <div class="row g-2">
              <div class="col-6">
                <div class="fw-bold text-muted text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.05em;">Luotu</div>
                <div>${escapeHtml(formatDateTime(species.createdAt))}</div>
              </div>
              <div class="col-6">
                <div class="fw-bold text-muted text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.05em;">Paivitetty</div>
                <div>${escapeHtml(formatDateTime(species.updatedAt))}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer bg-white border-top-0 pt-0 pb-3">
          <div class="d-grid gap-2">
            <button class="btn btn-outline-secondary fw-bold" type="button" onclick="openEditFishModal('${species.id}')">
              <i class="bi bi-pencil-square"></i> Muokkaa kalaa
            </button>
            <button class="btn btn-outline-danger fw-bold" type="button" onclick="deleteFish('${species.id}')">
              <i class="bi bi-trash"></i> Poista kala
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadFish() {
  const container = document.getElementById("fishContainer");
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="col-12 text-center text-muted py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/fish/all`, {
      credentials: "same-origin",
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Kalojen haku epaonnistui.");
    }

    const fish = result.data || [];
    if (fish.length === 0) {
      container.innerHTML =
        '<div class="col-12 text-center text-muted py-5 bg-white rounded shadow-sm">Kaloja ei ole viela lisatty.</div>';
      return;
    }

    fishCache.clear();
    fish.forEach((species) => {
      fishCache.set(species.id, species);
    });

    container.innerHTML = fish.map(renderFishCard).join("");
  } catch (error) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-5 bg-white rounded shadow-sm">${escapeHtml(error.message || "Kalojen haku epaonnistui.")}</div>`;
  }
}

async function submitFishForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalHtml = submitButton.innerHTML;
  const finnishName = document.getElementById("fishName").value.trim();
  const scientificName = document
    .getElementById("fishScientificName")
    .value.trim();

  if (!finnishName) {
    showFishMessage("Kalan nimi on pakollinen.", "danger");
    return;
  }

  submitButton.disabled = true;
  submitButton.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Tallennetaan...';

  try {
    const csrfToken = await fetchCsrfToken();
    const response = await fetch(`${API_BASE_URL}/admin/fish`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        finnishName,
        scientificName: scientificName || null,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Kalan tallennus epaonnistui.");
    }

    showFishMessage("Kala lisatty onnistuneesti.", "success");
    form.reset();
    await loadFish();
  } catch (error) {
    showFishMessage(error.message || "Kalan tallennus epaonnistui.", "danger");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalHtml;
  }
}

function resetEditFishForm() {
  const form = document.getElementById("editFishForm");
  if (form) {
    form.reset();
  }

  const recordId = document.getElementById("editFishRecordId");
  if (recordId) {
    recordId.value = "";
  }

  const subtitle = document.getElementById("editFishModalSubtitle");
  if (subtitle) {
    subtitle.textContent = "";
  }

  const message = document.getElementById("editFishMessage");
  if (message) {
    message.innerHTML = "";
  }
}

function openEditFishModal(speciesId) {
  const species = fishCache.get(speciesId);
  if (!species) {
    window.alert("Kalaa ei loytynyt muokkausta varten.");
    return;
  }

  document.getElementById("editFishRecordId").value = species.id;
  document.getElementById("editFishName").value = species.finnishName || "";
  document.getElementById("editFishScientificName").value =
    species.scientificName || "";

  const subtitle = document.getElementById("editFishModalSubtitle");
  if (subtitle) {
    subtitle.textContent = species.finnishName
      ? `Muokataan: ${species.finnishName}`
      : "Muokkaa kalan tietoja";
  }

  const message = document.getElementById("editFishMessage");
  if (message) {
    message.innerHTML = "";
  }

  if (!editFishModal) {
    const modalElement = document.getElementById("editFishModal");
    if (modalElement && window.bootstrap?.Modal) {
      editFishModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    }
  }

  editFishModal?.show();
}

async function submitEditFishForm(event) {
  event.preventDefault();

  const submitButton = event.target.querySelector('button[type="submit"]');
  const originalHtml = submitButton ? submitButton.innerHTML : "";
  const speciesId = document.getElementById("editFishRecordId").value;
  const finnishName = document.getElementById("editFishName").value.trim();
  const scientificName = document
    .getElementById("editFishScientificName")
    .value.trim();

  if (!finnishName) {
    showEditFishMessage("Kalan nimi on pakollinen.", "danger");
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Tallennetaan...';
  }

  try {
    const csrfToken = await fetchCsrfToken();
    const response = await fetch(`${API_BASE_URL}/admin/fish/${speciesId}`, {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        finnishName,
        scientificName: scientificName || null,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Kalan paivitys epaonnistui.");
    }

    showEditFishMessage("Kala paivitetty onnistuneesti.", "success");
    await loadFish();

    window.setTimeout(() => {
      editFishModal?.hide();
    }, 700);
  } catch (error) {
    showEditFishMessage(
      error.message || "Kalan paivitys epaonnistui.",
      "danger",
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalHtml;
    }
  }
}

async function deleteFish(speciesId) {
  if (!window.confirm("Haluatko varmasti poistaa taman kalan tietokannasta?")) {
    return;
  }

  try {
    const csrfToken = await fetchCsrfToken();
    const response = await fetch(`${API_BASE_URL}/admin/fish/${speciesId}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        "CSRF-Token": csrfToken,
      },
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Kalan poisto epaonnistui.");
    }

    showFishMessage("Kala poistettu onnistuneesti.", "success");
    await loadFish();
  } catch (error) {
    showFishMessage(error.message || "Kalan poisto epaonnistui.", "danger");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addFishForm");
  if (form) {
    form.addEventListener("submit", submitFishForm);
  }

  const editForm = document.getElementById("editFishForm");
  if (editForm) {
    editForm.addEventListener("submit", submitEditFishForm);
  }

  const refreshButton = document.getElementById("refreshFishButton");
  if (refreshButton) {
    refreshButton.addEventListener("click", loadFish);
  }

  const editModalElement = document.getElementById("editFishModal");
  if (editModalElement && window.bootstrap?.Modal) {
    editFishModal = bootstrap.Modal.getOrCreateInstance(editModalElement);
    editModalElement.addEventListener("hidden.bs.modal", resetEditFishForm);
  }

  loadFish();
});
