"use strict";

const API_BASE_URL = window.location.origin;

let importRows = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchCsrfToken() {
  const response = await fetch(`${API_BASE_URL}/admin/csrf-token`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("CSRF-tokenin haku epäonnistui.");
  }

  const data = await response.json();
  if (!data.csrfToken) {
    throw new Error("CSRF-token puuttuu vastauksesta.");
  }

  return data.csrfToken;
}

function showMessage(elementId, message, type) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  element.innerHTML = message
    ? `<div class="alert alert-${type} mb-0">${escapeHtml(message)}</div>`
    : "";
}

function fillSelect(selectId, items, emptyLabel) {
  const select = document.getElementById(selectId);
  if (!select) {
    return;
  }

  select.innerHTML =
    `<option value="">${escapeHtml(emptyLabel)}</option>` +
    items
      .map(
        (item) =>
          `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`,
      )
      .join("");
}

async function loadOptions() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/import/options`, {
      credentials: "same-origin",
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Valintojen haku epäonnistui.");
    }

    const data = result.data || {};
    fillSelect(
      "import-species",
      (data.species || []).map((item) => ({ value: item.finnishName, label: item.finnishName })),
      "Valitse laji",
    );
    fillSelect(
      "import-unit",
      (data.sortingUnits || []).map((item) => ({ value: item.name, label: item.name })),
      "Ei valintaa",
    );
    fillSelect(
      "import-batch",
      (data.batches || []).map((item) => ({ value: item.code, label: item.code })),
      "Ei valintaa",
    );
  } catch (error) {
    showMessage("manualMessage", error.message || "Valintojen haku epäonnistui.", "danger");
  }
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

const HEADER_ALIASES = {
  species: "species",
  laji: "species",
  speciesid: "species",
  observedat: "observedAt",
  ajankohta: "observedAt",
  aikaleima: "observedAt",
  date: "observedAt",
  sex: "sex",
  sukupuoli: "sex",
  lengthmm: "lengthMm",
  pituus: "lengthMm",
  pituusmm: "lengthMm",
  weightg: "weightG",
  paino: "weightG",
  painog: "weightG",
  aiconfidence: "aiConfidence",
  varmuus: "aiConfidence",
  confidence: "aiConfidence",
  sortingunit: "sortingUnit",
  lajitteluyksikko: "sortingUnit",
  yksikko: "sortingUnit",
  batch: "batch",
  era: "batch",
};

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("Tiedostossa tätyy olla otsikkorivi ja vähintään yksi datarivi.");
  }

  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";

  const headers = parseCsvLine(lines[0], delimiter).map((header) => {
    const key = normalizeHeader(header);
    if (!(key in HEADER_ALIASES)) {
      throw new Error(`Tuntematon otsikkosarake: "${header}".`);
    }
    return HEADER_ALIASES[key];
  });

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function formatRowValue(value) {
  return value === undefined || value === null || value === "" ? "–" : String(value);
}

function renderPreview() {
  const body = document.getElementById("preview-body");
  const summary = document.getElementById("preview-summary");
  if (!body || !summary) {
    return;
  }

  if (importRows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <i class="bi bi-inbox" style="font-size: 1.5rem;"></i>
          <p class="mt-2 mb-0">Ei tuotavia rivejä</p>
        </td>
      </tr>
    `;
    summary.textContent = "Tuotavat rivit näkyvät tässä ennen tallennusta.";
    return;
  }

  body.innerHTML = importRows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(formatRowValue(row.species))}</td>
        <td>${escapeHtml(formatRowValue(row.observedAt))}</td>
        <td>${escapeHtml(formatRowValue(row.sex))}</td>
        <td class="text-end">${escapeHtml(formatRowValue(row.lengthMm))}</td>
        <td class="text-end">${escapeHtml(formatRowValue(row.weightG))}</td>
        <td class="text-end">${escapeHtml(formatRowValue(row.aiConfidence))}</td>
        <td>${escapeHtml(formatRowValue(row.sortingUnit))}</td>
        <td>${escapeHtml(formatRowValue(row.batch))}</td>
      </tr>
    `,
    )
    .join("");

  summary.textContent = `Tuotavia rivejä: ${importRows.length}`;
}

function setImportedRows(rows, infoText) {
  importRows = rows;
  renderPreview();

  document.getElementById("import-file-button").disabled = rows.length === 0;
  document.getElementById("clear-file-button").disabled = rows.length === 0;
  document.getElementById("file-info").textContent = infoText || "";
}

async function handleFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const rows = parseCsv(text);
    setImportedRows(rows, `Tiedosto: ${file.name} – rivejä: ${rows.length}`);
    showMessage("fileMessage", "", "success");
  } catch (error) {
    setImportedRows([], "");
    showMessage("fileMessage", error.message || "Tiedoston lukeminen epäonnistui.", "danger");
    event.target.value = "";
  }
}

async function postRows(rows, messageElementId) {
  const csrfToken = await fetchCsrfToken();
  const response = await fetch(`${API_BASE_URL}/admin/import/observations`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ rows }),
  });

  const text = await response.text();
  let result = {};
  try {
    result = JSON.parse(text);
  } catch (parseError) {
    // Palvelin vastasi muulla kuin JSONilla (esim. HTML-virhesivu)
  }

  if (!response.ok) {
    const detail = result.error || text.trim().slice(0, 200);
    throw new Error(`Tuonti epäonnistui (HTTP ${response.status})${detail ? ": " + detail : ""}.`);
  }

  return result;
}

function formatImportResult(result) {
  let message = result.message || `Tuotiin ${result.created} havaintoa.`;

  if (result.errors && result.errors.length > 0) {
    const details = result.errors
      .map((error) => `rivi ${error.row}: ${error.error}`)
      .join(" | ");
    message += ` — ${details}`;
  }

  return message;
}

async function importFileRows(event) {
  const button = event.currentTarget;
  if (importRows.length === 0) {
    return;
  }

  button.disabled = true;
  const originalHtml = button.innerHTML;
  button.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Tuodaan...';

  try {
    const result = await postRows(importRows, "fileMessage");
    const failed = result.failed || 0;
    showMessage("fileMessage", formatImportResult(result), failed > 0 ? "warning" : "success");
    setImportedRows([], "");
    document.getElementById("file-upload").value = "";
  } catch (error) {
    showMessage("fileMessage", error.message || "Havaintojen tuonti epäonnistui.", "danger");
  } finally {
    button.disabled = importRows.length === 0;
    button.innerHTML = originalHtml;
  }
}

function clearImportFile() {
  setImportedRows([], "");
  const fileInput = document.getElementById("file-upload");
  if (fileInput) {
    fileInput.value = "";
  }
  showMessage("fileMessage", "", "success");
}

async function submitManualForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalHtml = submitButton.innerHTML;

  const speciesId = document.getElementById("import-species").value;
  if (!speciesId) {
    showMessage("manualMessage", "Laji on pakollinen.", "danger");
    return;
  }

  const observedAt = document.getElementById("import-observed-at").value;
  const lengthMm = document.getElementById("import-length").value;
  const weightG = document.getElementById("import-weight").value;
  const aiConfidence = document.getElementById("import-confidence").value;

  const row = {
    species: speciesId,
    sex: document.getElementById("import-sex").value,
    sortingUnit: document.getElementById("import-unit").value,
    batch: document.getElementById("import-batch").value,
  };

  if (observedAt) {
    row.observedAt = observedAt;
  }
  if (lengthMm) {
    row.lengthMm = lengthMm;
  }
  if (weightG) {
    row.weightG = weightG;
  }
  if (aiConfidence) {
    row.aiConfidence = aiConfidence;
  }

  submitButton.disabled = true;
  submitButton.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Tallennetaan...';

  try {
    const result = await postRows([row], "manualMessage");
    showMessage("manualMessage", formatImportResult(result), "success");
    form.reset();
  } catch (error) {
    showMessage("manualMessage", error.message || "Havainnon tallennus epäonnistui.", "danger");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalHtml;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-upload");
  if (fileInput) {
    fileInput.addEventListener("change", handleFileSelected);
  }

  const importButton = document.getElementById("import-file-button");
  if (importButton) {
    importButton.addEventListener("click", importFileRows);
  }

  const clearButton = document.getElementById("clear-file-button");
  if (clearButton) {
    clearButton.addEventListener("click", clearImportFile);
  }

  const manualForm = document.getElementById("manualImportForm");
  if (manualForm) {
    manualForm.addEventListener("submit", submitManualForm);
  }

  loadOptions();
});
