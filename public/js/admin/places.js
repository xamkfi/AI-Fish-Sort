'use strict';

const API_BASE_URL = window.location.origin;
const locationCache = new Map();
let editLocationModal = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value) {
    return 'Ei tiedossa';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Ei tiedossa';
  }

  return date.toLocaleString('fi-FI', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function fetchCsrfToken() {
  const response = await fetch(`${API_BASE_URL}/admin/csrf-token`, {
    credentials: 'same-origin'
  });

  if (!response.ok) {
    throw new Error('CSRF-tokenin haku epäonnistui.');
  }

  const data = await response.json();
  if (!data.csrfToken) {
    throw new Error('CSRF-token puuttuu vastauksesta.');
  }

  return data.csrfToken;
}

function showLocationMessage(message, type) {
  const messageElement = document.getElementById('locationMessage');
  if (!messageElement) {
    return;
  }

  messageElement.innerHTML = `<div class="alert alert-${type} mb-0">${escapeHtml(message)}</div>`;
}

function showEditLocationMessage(message, type) {
  const messageElement = document.getElementById('editLocationMessage');
  if (!messageElement) {
    return;
  }

  messageElement.innerHTML = `<div class="alert alert-${type} mb-0">${escapeHtml(message)}</div>`;
}

function renderLocationCard(location) {
  const description = location.description || 'Ei kuvausta vielä.';
  const municipality = location.municipality || 'Ei paikkakuntaa';

  return `
    <div class="col-md-6 col-xl-4">
      <div class="card h-100 shadow-sm border-0">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-3 gap-3">
            <div>
              <h5 class="card-title mb-1">${escapeHtml(location.name)}</h5>
              <div class="text-muted small">${escapeHtml(municipality)}</div>
            </div>
            <span class="badge text-bg-primary">Sorting unit</span>
          </div>

          <p class="card-text text-muted flex-grow-1" style="white-space: pre-wrap;">${escapeHtml(description)}</p>

          <div class="rounded bg-light border p-3 small mt-3">
            <div class="mb-2">
              <div class="fw-bold text-muted text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.05em;">ID</div>
              <code class="text-break">${escapeHtml(location.id)}</code>
            </div>
            <div class="mb-2">
              <div class="fw-bold text-muted text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.05em;">Paikkakunta</div>
              <div>${escapeHtml(municipality)}</div>
            </div>
            <div class="row g-2">
              <div class="col-6">
                <div class="fw-bold text-muted text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.05em;">Luotu</div>
                <div>${escapeHtml(formatDateTime(location.createdAt))}</div>
              </div>
              <div class="col-6">
                <div class="fw-bold text-muted text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.05em;">Päivitetty</div>
                <div>${escapeHtml(formatDateTime(location.updatedAt))}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer bg-white border-top-0 pt-0 pb-3">
          <div class="d-grid gap-2">
            <button class="btn btn-outline-secondary fw-bold" type="button" onclick="openEditPlaceModal('${location.id}')">
              <i class="bi bi-pencil-square"></i> Muokkaa lajitteluyksikköä
            </button>
            <button class="btn btn-outline-danger fw-bold" type="button" onclick="deletePlace('${location.id}')">
              <i class="bi bi-trash"></i> Poista lajitteluyksikkö
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadLocations() {
  const container = document.getElementById('locationsContainer');
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="col-12 text-center text-muted py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/sorting-units/all`, {
      credentials: 'same-origin'
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Lajitteluyksiköiden haku epäonnistui.');
    }

    const locations = result.data || [];
    if (locations.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-muted py-5 bg-white rounded shadow-sm">Lajitteluyksiköitä ei ole vielä lisätty.</div>';
      return;
    }

    locationCache.clear();
    locations.forEach((location) => {
      locationCache.set(location.id, location);
    });

    container.innerHTML = locations.map(renderLocationCard).join('');
  } catch (error) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-5 bg-white rounded shadow-sm">${escapeHtml(error.message || 'Lajitteluyksiköiden haku epäonnistui.')}</div>`;
  }
}

async function submitLocationForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalHtml = submitButton.innerHTML;
  const name = document.getElementById('locationName').value.trim();
  const municipality = document.getElementById('locationMunicipality').value.trim();
  const description = document.getElementById('locationDescription').value.trim();

  if (!name) {
    showLocationMessage('Lajitteluyksikön nimi on pakollinen.', 'danger');
    return;
  }

  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Tallennetaan...';

  try {
    const csrfToken = await fetchCsrfToken();
    const response = await fetch(`${API_BASE_URL}/admin/sorting-units`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
      },
      body: JSON.stringify({ name, municipality, description })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Lajitteluyksikön tallennus epäonnistui.');
    }

    showLocationMessage('Lajitteluyksikkö lisätty onnistuneesti.', 'success');
    form.reset();
    await loadLocations();
  } catch (error) {
    showLocationMessage(error.message || 'Lajitteluyksikön tallennus epäonnistui.', 'danger');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalHtml;
  }
}

function resetEditLocationForm() {
  const form = document.getElementById('editLocationForm');
  if (form) {
    form.reset();
  }

  const recordId = document.getElementById('editLocationRecordId');
  if (recordId) {
    recordId.value = '';
  }

  const subtitle = document.getElementById('editLocationModalSubtitle');
  if (subtitle) {
    subtitle.textContent = '';
  }

  const message = document.getElementById('editLocationMessage');
  if (message) {
    message.innerHTML = '';
  }
}

function openEditPlaceModal(locationId) {
  const location = locationCache.get(locationId);
  if (!location) {
    window.alert('Lajitteluyksikköä ei löytynyt muokkausta varten.');
    return;
  }

  document.getElementById('editLocationRecordId').value = location.id;
  document.getElementById('editLocationName').value = location.name || '';
  document.getElementById('editLocationMunicipality').value = location.municipality || '';
  document.getElementById('editLocationDescription').value = location.description || '';

  const subtitle = document.getElementById('editLocationModalSubtitle');
  if (subtitle) {
    subtitle.textContent = location.name ? `Muokataan: ${location.name}` : 'Muokkaa lajitteluyksikön tietoja';
  }

  const message = document.getElementById('editLocationMessage');
  if (message) {
    message.innerHTML = '';
  }

  if (!editLocationModal) {
    const modalElement = document.getElementById('editLocationModal');
    if (modalElement && window.bootstrap?.Modal) {
      editLocationModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    }
  }

  editLocationModal?.show();
}

async function submitEditLocationForm(event) {
  event.preventDefault();

  const submitButton = event.target.querySelector('button[type="submit"]');
  const originalHtml = submitButton ? submitButton.innerHTML : '';
  const locationId = document.getElementById('editLocationRecordId').value;
  const name = document.getElementById('editLocationName').value.trim();
  const municipality = document.getElementById('editLocationMunicipality').value.trim();
  const description = document.getElementById('editLocationDescription').value.trim();

  if (!name) {
    showEditLocationMessage('Lajitteluyksikön nimi on pakollinen.', 'danger');
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Tallennetaan...';
  }

  try {
    const csrfToken = await fetchCsrfToken();
    const response = await fetch(`${API_BASE_URL}/admin/sorting-units/${locationId}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        name,
        municipality,
        description
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Lajitteluyksikön päivitys epäonnistui.');
    }

    showEditLocationMessage('Lajitteluyksikkö päivitetty onnistuneesti.', 'success');
    await loadLocations();

    window.setTimeout(() => {
      editLocationModal?.hide();
    }, 700);
  } catch (error) {
    showEditLocationMessage(error.message || 'Lajitteluyksikön päivitys epäonnistui.', 'danger');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalHtml;
    }
  }
}

async function deletePlace(locationId) {
  if (!window.confirm('Haluatko varmasti poistaa tämän lajitteluyksikön tietokannasta?')) {
    return;
  }

  try {
    const csrfToken = await fetchCsrfToken();
    const response = await fetch(`${API_BASE_URL}/admin/sorting-units/${locationId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: {
        'CSRF-Token': csrfToken
      }
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Lajitteluyksikön poisto epäonnistui.');
    }

    showLocationMessage('Lajitteluyksikkö poistettu onnistuneesti.', 'success');
    await loadLocations();
  } catch (error) {
    showLocationMessage(error.message || 'Lajitteluyksikön poisto epäonnistui.', 'danger');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addLocationForm');
  if (form) {
    form.addEventListener('submit', submitLocationForm);
  }

  const editForm = document.getElementById('editLocationForm');
  if (editForm) {
    editForm.addEventListener('submit', submitEditLocationForm);
  }

  const refreshButton = document.getElementById('refreshLocationsButton');
  if (refreshButton) {
    refreshButton.addEventListener('click', loadLocations);
  }

  const editModalElement = document.getElementById('editLocationModal');
  if (editModalElement && window.bootstrap?.Modal) {
    editLocationModal = bootstrap.Modal.getOrCreateInstance(editModalElement);
    editModalElement.addEventListener('hidden.bs.modal', resetEditLocationForm);
  }

  loadLocations();
});
