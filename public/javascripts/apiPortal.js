'use strict';

(function() {
  const API_BASE_URL = window.location.origin;
  const builderState = {
    target: 'fish-observations',
    groupBy: 'species',
    limit: '',
    offset: '',
    rules: []
  };

  const optionsState = {
    species: [
      { id: '11111111-1111-4111-8111-111111111111', label: 'Hauki' },
      { id: '22222222-2222-4222-8222-222222222222', label: 'Ahven' },
      { id: '33333333-3333-4333-8333-333333333333', label: 'Kuha' },
      { id: '44444444-4444-4444-8444-444444444444', label: 'Lohi' },
      { id: '55555555-5555-4555-8555-555555555555', label: 'Siika' }
    ],
    sortingUnits: [
      { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: 'Linja A' },
      { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: 'Linja B' },
      { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', label: 'Vastaanottoallas' },
      { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', label: 'Poistopiste' },
      { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', label: 'Testikamera' }
    ],
    catchLocations: [
      { id: 'ca111111-1111-4111-8111-111111111111', label: 'Pyhäjärven pohjoinen selkä' },
      { id: 'ca222222-2222-4222-8222-222222222222', label: 'Näsijärven rantavyöhyke' }
    ],
    batches: [
      { id: 'ba111111-1111-4111-8111-111111111111', label: 'ERA-2026-04-19-A' },
      { id: 'ba222222-2222-4222-8222-222222222222', label: 'ERA-2026-04-20-B' }
    ]
  };

  const targetDefinitions = {
    species: {
      ruleFields: [],
      supportsGroupBy: false,
      supportsPagination: false
    },
    'sorting-units': {
      ruleFields: [],
      supportsGroupBy: false,
      supportsPagination: false
    },
    'catch-locations': {
      ruleFields: [],
      supportsGroupBy: false,
      supportsPagination: false
    },
    'fish-batches': {
      ruleFields: ['batchId', 'catchLocationId'],
      supportsGroupBy: false,
      supportsPagination: true
    },
    'fish-observations': {
      ruleFields: ['speciesId', 'sortingUnitId', 'batchId', 'catchLocationId', 'sex', 'from', 'to'],
      supportsGroupBy: false,
      supportsPagination: true
    },
    'fish-stats/count': {
      ruleFields: ['speciesId', 'sortingUnitId', 'batchId', 'catchLocationId', 'sex', 'from', 'to'],
      supportsGroupBy: false,
      supportsPagination: false
    },
    'fish-stats/summary': {
      ruleFields: ['speciesId', 'sortingUnitId', 'batchId', 'catchLocationId', 'sex', 'from', 'to', 'breakdown'],
      supportsGroupBy: true,
      supportsPagination: false
    },
    'fish-stats/timeline': {
      ruleFields: ['speciesId', 'sortingUnitId', 'batchId', 'catchLocationId', 'sex', 'from', 'to', 'granularity', 'timelineGroupBy', 'breakdown'],
      supportsGroupBy: false,
      supportsPagination: false
    },
    'fish-stats/distribution': {
      ruleFields: ['metric', 'bins', 'speciesId', 'sortingUnitId', 'batchId', 'catchLocationId', 'sex', 'from', 'to'],
      supportsGroupBy: false,
      supportsPagination: false
    },
    'fish-stats/comparison': {
      ruleFields: ['speciesId', 'sortingUnitId', 'batchId', 'catchLocationId', 'sex', 'from', 'to'],
      supportsGroupBy: false,
      supportsPagination: false
    }
  };

  const fieldDefinitions = {
    speciesId: {
      label: 'Kalalaji',
      type: 'species'
    },
    sortingUnitId: {
      label: 'Lajitteluyksikkö',
      type: 'sortingUnit'
    },
    batchId: {
      label: 'Erä',
      type: 'batch'
    },
    catchLocationId: {
      label: 'Pyyntipaikka',
      type: 'catchLocation'
    },
    sex: {
      label: 'Sukupuoli',
      type: 'enum',
      options: [
        { value: 'male', label: 'uros' },
        { value: 'female', label: 'naaras' },
        { value: 'unknown', label: 'tuntematon' }
      ]
    },
    from: {
      label: 'Alkaa ajasta',
      type: 'datetime'
    },
    to: {
      label: 'Päättyy aikaan',
      type: 'datetime'
    },
    breakdown: {
      label: 'Erittely',
      type: 'enum',
      options: [
        { value: 'speciesSexWeight', label: 'Kalalaji, sukupuoli ja paino' }
      ]
    },
    granularity: {
      label: 'Aikatarkkuus',
      type: 'enum',
      options: [
        { value: 'day', label: 'Päivä' },
        { value: 'week', label: 'Viikko' },
        { value: 'month', label: 'Kuukausi' }
      ]
    },
    timelineGroupBy: {
      label: 'Ryhmittely',
      type: 'enum',
      apiField: 'groupBy',
      options: [
        { value: 'species', label: 'Lajeittain' },
        { value: 'sortingUnit', label: 'Lajitteluyksiköittäin' },
        { value: 'catchLocation', label: 'Saalispaikoittain' },
        { value: 'batch', label: 'Erien mukaan' },
        { value: 'sex', label: 'Sukupuolen mukaan' }
      ]
    },
    metric: {
      label: 'Mittari',
      type: 'enum',
      options: [
        { value: 'lengthMm', label: 'Pituus (mm)' },
        { value: 'weightG', label: 'Paino (g)' },
        { value: 'aiConfidence', label: 'AI-luottamus' }
      ]
    },
    bins: {
      label: 'Lokeroita',
      type: 'integer'
    }
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getBuilderElements() {
    return {
      target: document.getElementById('builderTarget'),
      groupByField: document.getElementById('groupByField'),
      groupBy: document.getElementById('builderGroupBy'),
      paginationField: document.getElementById('paginationField'),
      limit: document.getElementById('builderLimit'),
      offset: document.getElementById('builderOffset'),
      rules: document.getElementById('builderRules'),
      builtUrl: document.getElementById('builtUrl'),
      responseCode: document.querySelector('#responseOutput code'),
      addRuleButton: document.getElementById('addRuleButton'),
      clearRulesButton: document.getElementById('clearRulesButton')
    };
  }

  function getTargetDefinition() {
    return targetDefinitions[builderState.target];
  }

  function createRule(field, value) {
    return {
      id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      field,
      value: value || ''
    };
  }

  function getUnusedFields(ruleId) {
    const definition = getTargetDefinition();
    const usedFields = builderState.rules
      .filter((rule) => rule.id !== ruleId)
      .map((rule) => rule.field);

    return definition.ruleFields.filter((field) => !usedFields.includes(field));
  }

  function getNextField() {
    return getUnusedFields(null)[0] || null;
  }

  function toIsoString(value) {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toISOString();
  }

  function normalizeIntegerInput(value, max) {
    if (value === '') {
      return '';
    }

    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) {
      return '';
    }

    if (max && number > max) {
      return String(max);
    }

    return String(number);
  }

  function hasAnyBuilderInput() {
    return builderState.rules.length > 0 ||
      builderState.limit !== '' ||
      builderState.offset !== '' ||
      builderState.groupBy !== 'species';
  }

  function renderValueInput(rule) {
    const definition = fieldDefinitions[rule.field];

    if (definition.type === 'species') {
      const options = optionsState.species.map((species) => `
        <option value="${escapeHtml(species.id)}" ${species.id === rule.value ? 'selected' : ''}>${escapeHtml(species.label)}</option>
      `).join('');

      return `
        <select class="rule-value" data-rule-id="${escapeHtml(rule.id)}">
          <option value="">Valitse kalalaji</option>
          ${options}
        </select>
      `;
    }

    if (definition.type === 'sortingUnit') {
      const options = optionsState.sortingUnits.map((sortingUnit) => `
        <option value="${escapeHtml(sortingUnit.id)}" ${sortingUnit.id === rule.value ? 'selected' : ''}>${escapeHtml(sortingUnit.label)}</option>
      `).join('');

      return `
        <select class="rule-value" data-rule-id="${escapeHtml(rule.id)}">
          <option value="">Valitse lajitteluyksikkö</option>
          ${options}
        </select>
      `;
    }

    if (definition.type === 'batch') {
      const options = optionsState.batches.map((batch) => `
        <option value="${escapeHtml(batch.id)}" ${batch.id === rule.value ? 'selected' : ''}>${escapeHtml(batch.label)}</option>
      `).join('');

      return `
        <select class="rule-value" data-rule-id="${escapeHtml(rule.id)}">
          <option value="">Valitse erä</option>
          ${options}
        </select>
      `;
    }

    if (definition.type === 'catchLocation') {
      const options = optionsState.catchLocations.map((catchLocation) => `
        <option value="${escapeHtml(catchLocation.id)}" ${catchLocation.id === rule.value ? 'selected' : ''}>${escapeHtml(catchLocation.label)}</option>
      `).join('');

      return `
        <select class="rule-value" data-rule-id="${escapeHtml(rule.id)}">
          <option value="">Valitse pyyntipaikka</option>
          ${options}
        </select>
      `;
    }

    if (definition.type === 'enum') {
      const options = definition.options.map((option) => `
        <option value="${escapeHtml(option.value)}" ${option.value === rule.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>
      `).join('');

      return `
        <select class="rule-value" data-rule-id="${escapeHtml(rule.id)}">
          <option value="">Valitse arvo</option>
          ${options}
        </select>
      `;
    }

    if (definition.type === 'integer') {
      return `<input class="rule-value" data-rule-id="${escapeHtml(rule.id)}" type="number" min="0" step="1" value="${escapeHtml(rule.value)}">`;
    }

    return `<input class="rule-value" data-rule-id="${escapeHtml(rule.id)}" type="datetime-local" value="${escapeHtml(rule.value)}">`;
  }

  function renderRules() {
    const elements = getBuilderElements();
    const definition = getTargetDefinition();

    if (definition.ruleFields.length === 0) {
      elements.rules.innerHTML = '<div class="empty-builder">Tälle endpointille ei ole määritettäviä query-parametreja.</div>';
      return;
    }

    if (builderState.rules.length === 0) {
      elements.rules.innerHTML = '<div class="empty-builder">Lisää ensimmäinen parametri aloittaaksesi kyselyn määrityksen.</div>';
      return;
    }

    elements.rules.innerHTML = builderState.rules.map((rule) => {
      const availableFields = definition.ruleFields.filter((field) => {
        if (field === rule.field) {
          return true;
        }

        return !builderState.rules.some((otherRule) => otherRule.id !== rule.id && otherRule.field === field);
      });

      const fieldOptions = availableFields.map((field) => `
        <option value="${escapeHtml(field)}" ${field === rule.field ? 'selected' : ''}>${escapeHtml(fieldDefinitions[field].label)}</option>
      `).join('');

      return `
        <div class="rule-editor" data-rule-id="${escapeHtml(rule.id)}">
          <div>
            <label>Parametri</label>
            <select class="rule-field" data-rule-id="${escapeHtml(rule.id)}">
              ${fieldOptions}
            </select>
          </div>
          <div>
            <label>Arvo</label>
            ${renderValueInput(rule)}
          </div>
          <button class="rule-editor__delete" type="button" data-remove-rule="${escapeHtml(rule.id)}">Poista</button>
        </div>
      `;
    }).join('');
  }

  function getBuiltUrl() {
    const url = new URL(`${API_BASE_URL}/api/v1/${builderState.target}`);

    builderState.rules.forEach((rule) => {
      if (!rule.value) {
        return;
      }

      const value = rule.field === 'from' || rule.field === 'to'
        ? toIsoString(rule.value)
        : rule.value;

      const definition = fieldDefinitions[rule.field];
      const paramName = (definition && definition.apiField) || rule.field;

      url.searchParams.set(paramName, value);
    });

    if (builderState.target === 'fish-stats/summary') {
      url.searchParams.set('groupBy', builderState.groupBy);
    }

    if (builderState.target === 'fish-observations' || builderState.target === 'fish-batches') {
      if (builderState.limit !== '') {
        url.searchParams.set('limit', builderState.limit);
      }

      if (builderState.offset !== '') {
        url.searchParams.set('offset', builderState.offset);
      }
    }

    return url.toString();
  }

  function renderPreview() {
    const elements = getBuilderElements();
    const definition = getTargetDefinition();

    elements.builtUrl.textContent = getBuiltUrl();
    elements.groupByField.style.display = definition.supportsGroupBy ? 'grid' : 'none';
    elements.paginationField.style.display = definition.supportsPagination ? 'grid' : 'none';
    elements.addRuleButton.disabled = definition.ruleFields.length === 0 || getNextField() === null;
    elements.clearRulesButton.disabled = !hasAnyBuilderInput();
  }

  function syncRuleField(ruleId, field) {
    builderState.rules = builderState.rules.map((rule) => (
      rule.id === ruleId
        ? { id: rule.id, field, value: '' }
        : rule
    ));
  }

  function syncRuleValue(ruleId, value) {
    builderState.rules = builderState.rules.map((rule) => (
      rule.id === ruleId
        ? { ...rule, value }
        : rule
    ));
  }

  function attachRuleEvents() {
    document.querySelectorAll('.rule-field').forEach((element) => {
      element.addEventListener('change', (event) => {
        syncRuleField(event.target.dataset.ruleId, event.target.value);
        renderRules();
        attachRuleEvents();
        renderPreview();
      });
    });

    document.querySelectorAll('.rule-value').forEach((element) => {
      element.addEventListener('change', (event) => {
        syncRuleValue(event.target.dataset.ruleId, event.target.value);
        renderPreview();
      });

      element.addEventListener('input', (event) => {
        syncRuleValue(event.target.dataset.ruleId, event.target.value);
        renderPreview();
      });
    });

    document.querySelectorAll('[data-remove-rule]').forEach((element) => {
      element.addEventListener('click', () => {
        builderState.rules = builderState.rules.filter((rule) => rule.id !== element.dataset.removeRule);
        renderRules();
        attachRuleEvents();
        renderPreview();
      });
    });
  }

  async function loadBuilderOptions() {
    const [speciesResponse, sortingUnitsResponse, catchLocationsResponse, batchesResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/v1/species`),
      fetch(`${API_BASE_URL}/api/v1/sorting-units`),
      fetch(`${API_BASE_URL}/api/v1/catch-locations`),
      fetch(`${API_BASE_URL}/api/v1/fish-batches`)
    ]);

    const speciesData = await speciesResponse.json().catch(() => ({ data: [] }));
    const sortingUnitsData = await sortingUnitsResponse.json().catch(() => ({ data: [] }));
    const catchLocationsData = await catchLocationsResponse.json().catch(() => ({ data: [] }));
    const batchesData = await batchesResponse.json().catch(() => ({ data: [] }));

    if (Array.isArray(speciesData.data) && speciesData.data.length > 0) {
      optionsState.species = speciesData.data.map((item) => ({
        id: item.id,
        label: item.finnishName
      }));
    }

    if (Array.isArray(sortingUnitsData.data) && sortingUnitsData.data.length > 0) {
      optionsState.sortingUnits = sortingUnitsData.data.map((item) => ({
        id: item.id,
        label: item.name
      }));
    }

    if (Array.isArray(catchLocationsData.data) && catchLocationsData.data.length > 0) {
      optionsState.catchLocations = catchLocationsData.data.map((item) => ({
        id: item.id,
        label: item.name
      }));
    }

    if (Array.isArray(batchesData.data) && batchesData.data.length > 0) {
      optionsState.batches = batchesData.data.map((item) => ({
        id: item.id,
        label: item.code
      }));
    }
  }

  function resetBuilderState() {
    builderState.rules = [];
    builderState.groupBy = 'species';
    builderState.limit = '';
    builderState.offset = '';
  }

  function renderAll() {
    const elements = getBuilderElements();
    elements.target.value = builderState.target;
    elements.groupBy.value = builderState.groupBy;
    elements.limit.value = builderState.limit;
    elements.offset.value = builderState.offset;

    renderRules();
    attachRuleEvents();
    renderPreview();
  }

  async function testBuiltUrl() {
    const elements = getBuilderElements();
    elements.responseCode.textContent = '{\n  "loading": true\n}';

    try {
      const response = await fetch(getBuiltUrl(), {
        headers: {
          Accept: 'application/json'
        }
      });

      const data = await response.json().catch(() => ({
        error: {
          message: 'Response was not valid JSON.'
        }
      }));

      elements.responseCode.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      elements.responseCode.textContent = JSON.stringify({
        error: {
          message: error.message || 'Request failed.'
        }
      }, null, 2);
    }
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);

      if (button) {
        const original = button.textContent;
        button.textContent = 'Kopioitu';
        window.setTimeout(() => {
          button.textContent = original;
        }, 1300);
      }
    } catch (error) {
      window.alert('Kopiointi ei onnistunut.');
    }
  }

  async function init() {
    const elements = getBuilderElements();

    await loadBuilderOptions().catch(() => {});
    renderAll();

    elements.target.addEventListener('change', (event) => {
      builderState.target = event.target.value;
      resetBuilderState();
      renderAll();
    });

    elements.groupBy.addEventListener('change', (event) => {
      builderState.groupBy = event.target.value;
      renderPreview();
    });

    elements.limit.addEventListener('input', (event) => {
      builderState.limit = normalizeIntegerInput(event.target.value, 200);
      event.target.value = builderState.limit;
      renderPreview();
    });

    elements.offset.addEventListener('input', (event) => {
      builderState.offset = normalizeIntegerInput(event.target.value);
      event.target.value = builderState.offset;
      renderPreview();
    });

    elements.addRuleButton.addEventListener('click', () => {
      const nextField = getNextField();

      if (!nextField) {
        return;
      }

      builderState.rules.push(createRule(nextField));
      renderRules();
      attachRuleEvents();
      renderPreview();
    });

    elements.clearRulesButton.addEventListener('click', () => {
      resetBuilderState();
      renderAll();
    });

    document.getElementById('copyUrlButton').addEventListener('click', (event) => {
      copyText(getBuiltUrl(), event.currentTarget);
    });

    document.getElementById('testUrlButton').addEventListener('click', testBuiltUrl);

    document.querySelectorAll('[data-copy-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.querySelector(button.dataset.copyTarget);
        if (target) {
          copyText(target.textContent, button);
        }
      });
    });

  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch((error) => {
      const elements = getBuilderElements();
      elements.responseCode.textContent = JSON.stringify({
        error: {
          message: error.message || 'Builderin alustaminen epäonnistui.'
        }
      }, null, 2);
    });
  });
})();
