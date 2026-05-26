'use strict';

(function () {
  const PAGE_SIZE = 20;

  const state = {
    filters: {
      from: null,
      to: null,
      speciesId: [],
      sortingUnitId: [],
      catchLocationId: [],
      batchId: [],
      sex: ''
    },
    timelineGranularity: 'month',
    timelineSpeciesGranularity: 'month',
    pagination: { offset: 0, limit: PAGE_SIZE, total: 0 }
  };

  const charts = {
    timeline: null,
    timelineSpecies: null,
    topSpecies: null,
    catchLocations: null,
    batches: null,
    sortingUnits: null,
    sex: null,
    length: null,
    weight: null,
    comparisonWeight: null,
    comparisonCount: null,
    comparisonAvgWeight: null,
    comparisonAvgLength: null,
    comparisonSex: null,
    scatter: null
  };

  const dom = {};
  const filterOptions = {
    batches: []
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(message, isError) {
    if (!dom.status) return;
    dom.status.textContent = message || '';
    dom.status.classList.toggle('is-error', Boolean(isError));
  }

  function defaultDateRange() {
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10)
    };
  }

  function readFilterUI() {
    const fromVal = dom.from.value || null;
    const toVal = dom.to.value || null;

    state.filters.from = fromVal ? fromVal + 'T00:00:00.000Z' : null;
    state.filters.to = toVal ? toVal + 'T23:59:59.999Z' : null;

    state.filters.speciesId = dom.speciesDropdown.getSelected();
    state.filters.sortingUnitId = dom.sortingUnitDropdown.getSelected();
    state.filters.catchLocationId = dom.catchLocationDropdown.getSelected();
    state.filters.batchId = dom.batchDropdown.getSelected();
    state.filters.sex = dom.sex.value || '';
  }

  function activeFilters() {
    return {
      from: state.filters.from,
      to: state.filters.to,
      speciesId: state.filters.speciesId,
      sortingUnitId: state.filters.sortingUnitId,
      catchLocationId: state.filters.catchLocationId,
      batchId: state.filters.batchId,
      sex: state.filters.sex
    };
  }

  function setEmpty(name, isEmpty) {
    const el = document.querySelector('[data-empty-for="' + name + '"]');
    if (el) {
      el.hidden = !isEmpty;
    }
  }

  function formatNumber(value, decimals) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '–';
    }
    const num = Number(value);
    if (decimals !== undefined) {
      return num.toFixed(decimals).replace('.', ',');
    }
    return num.toLocaleString('fi-FI');
  }

  function formatDateTime(iso) {
    if (!iso) return '–';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '–';
    return d.toLocaleString('fi-FI', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function setStat(key, value) {
    const el = document.querySelector('[data-stat="' + key + '"]');
    if (el) {
      el.textContent = value;
    }
  }

  function updateBatchDropdownOptions() {
    if (!dom.batchDropdown) {
      return;
    }

    const selectedCatchLocations = new Set(dom.catchLocationDropdown ? dom.catchLocationDropdown.getSelected() : []);
    const batches = selectedCatchLocations.size === 0
      ? filterOptions.batches
      : filterOptions.batches.filter(function (batch) {
        return selectedCatchLocations.has(batch.catchLocationId);
      });

    dom.batchDropdown.setItems(batches.map(function (batch) {
      return { value: batch.id, label: batch.code };
    }));
  }

  async function loadFilterOptions() {
    try {
      const [speciesRes, sortingUnitsRes, catchLocationsRes, batchesRes] = await Promise.all([
        FishApi.listSpecies(),
        FishApi.listSortingUnits(),
        FishApi.listCatchLocations(),
        FishApi.listBatches()
      ]);

      const speciesData = (speciesRes && speciesRes.data) || [];
      const sortingUnitData = (sortingUnitsRes && sortingUnitsRes.data) || [];
      const catchLocationData = (catchLocationsRes && catchLocationsRes.data) || [];
      const batchData = (batchesRes && batchesRes.data) || [];

      dom.speciesDropdown.setItems(speciesData.map(function (s) {
        return { value: s.id, label: s.finnishName };
      }));

      dom.sortingUnitDropdown.setItems(sortingUnitData.map(function (unit) {
        return { value: unit.id, label: unit.name };
      }));

      dom.catchLocationDropdown.setItems(catchLocationData.map(function (location) {
        return { value: location.id, label: location.name };
      }));

      filterOptions.batches = batchData.map(function (batch) {
        return {
          id: batch.id,
          code: batch.code,
          catchLocationId: batch.catchLocationId
        };
      });
      updateBatchDropdownOptions();
    } catch (err) {
      console.error('Suodatinten lataus epäonnistui:', err);
      setStatus('Suodatinvaihtoehtoja ei voitu ladata.', true);
    }
  }

  async function refreshKPIs(filters) {
    try {
      const [count, species, sortingUnits] = await Promise.all([
        FishApi.statsCount(filters),
        FishApi.statsSummary(filters, 'species'),
        FishApi.statsSummary(filters, 'sortingUnit')
      ]);

      const totals = (count && count.data) || {};
      setStat('count', formatNumber(totals.count));
      setStat('totalWeight', formatNumber(totals.totalWeightKg, 2));
      setStat('avgLength', formatNumber(totals.avgLengthMm, 1));
      setStat('avgWeight', formatNumber(totals.avgWeightG, 1));

      const speciesRows = ((species && species.data) || []).filter(function (r) { return r.count > 0; });
      const sortingUnitRows = ((sortingUnits && sortingUnits.data) || []).filter(function (r) { return r.count > 0 && r.sortingUnit; });
      setStat('speciesCount', formatNumber(speciesRows.length));
      setStat('sortingUnitCount', formatNumber(sortingUnitRows.length));

      return { species: species, sortingUnits: sortingUnits };
    } catch (err) {
      console.error('KPI-haku epäonnistui:', err);
      throw err;
    }
  }

  async function refreshOverallTimeline(filters) {
    try {
      const overall = await FishApi.statsTimeline(filters, state.timelineGranularity, null, {
        breakdown: 'speciesSexWeight'
      });

      charts.timeline = DashboardCharts.renderTimeline($('chart-timeline'), charts.timeline, overall);
      setEmpty('timeline', !charts.timeline);
    } catch (err) {
      console.error('Havaintojen aikajanan haku epäonnistui:', err);
      throw err;
    }
  }

  async function refreshSpeciesTimeline(filters) {
    try {
      const bySpecies = await FishApi.statsTimeline(filters, state.timelineSpeciesGranularity, 'species');

      charts.timelineSpecies = DashboardCharts.renderTimelineSpecies($('chart-timeline-species'), charts.timelineSpecies, bySpecies);
      setEmpty('timeline-species', !charts.timelineSpecies);
    } catch (err) {
      console.error('Lajijakauman aikajanan haku epäonnistui:', err);
      throw err;
    }
  }

  async function refreshTimelineCharts(filters) {
    await Promise.all([
      refreshOverallTimeline(filters),
      refreshSpeciesTimeline(filters)
    ]);
  }

  async function refreshDistributions(filters) {
    try {
      const [length, weight] = await Promise.all([
        FishApi.statsDistribution(filters, 'lengthMm', 20),
        FishApi.statsDistribution(filters, 'weightG', 20)
      ]);

      charts.length = DashboardCharts.renderHistogram($('chart-length'), charts.length, length, '#63b3ed');
      setEmpty('length', !charts.length);
      $('meta-length').textContent = length && length.data && length.data.n > 0
        ? 'n=' + length.data.n + ' · mediaani ' + Math.round(length.data.p50) + ' mm'
        : '';

      charts.weight = DashboardCharts.renderHistogram($('chart-weight'), charts.weight, weight, '#68d391');
      setEmpty('weight', !charts.weight);
      $('meta-weight').textContent = weight && weight.data && weight.data.n > 0
        ? 'n=' + weight.data.n + ' · mediaani ' + Math.round(weight.data.p50) + ' g'
        : '';
    } catch (err) {
      console.error('Jakaumat: haku epäonnistui:', err);
      throw err;
    }
  }

  async function refreshCategoryDistributions(filters) {
    try {
      const tooltipBreakdown = { breakdown: 'speciesSexWeight' };
      const [catchLocations, batches, sortingUnits, sex] = await Promise.all([
        FishApi.statsSummary(filters, 'catchLocation', tooltipBreakdown),
        FishApi.statsSummary(filters, 'batch', tooltipBreakdown),
        FishApi.statsSummary(filters, 'sortingUnit', tooltipBreakdown),
        FishApi.statsSummary(filters, 'sex')
      ]);

      charts.catchLocations = DashboardCharts.renderCatchLocations($('chart-catch-locations'), charts.catchLocations, catchLocations);
      setEmpty('catch-locations', !charts.catchLocations);

      charts.batches = DashboardCharts.renderBatches($('chart-batches'), charts.batches, batches);
      setEmpty('batches', !charts.batches);

      charts.sortingUnits = DashboardCharts.renderSortingUnits($('chart-sorting-units'), charts.sortingUnits, sortingUnits);
      setEmpty('sorting-units', !charts.sortingUnits);

      charts.sex = DashboardCharts.renderSex($('chart-sex'), charts.sex, sex);
      setEmpty('sex', !charts.sex);
    } catch (err) {
      console.error('Jakaumien haku epäonnistui:', err);
      throw err;
    }
  }

  async function refreshComparisons(filters) {
    try {
      const comparison = await FishApi.statsComparison(filters, 'catchLocation');

      charts.comparisonWeight = DashboardCharts.renderCatchLocationSpeciesComparison(
        $('chart-comparison-weight'),
        charts.comparisonWeight,
        comparison,
        'totalWeightKg'
      );
      setEmpty('comparison-weight', !charts.comparisonWeight);

      charts.comparisonCount = DashboardCharts.renderCatchLocationSpeciesComparison(
        $('chart-comparison-count'),
        charts.comparisonCount,
        comparison,
        'count'
      );
      setEmpty('comparison-count', !charts.comparisonCount);

      charts.comparisonAvgWeight = DashboardCharts.renderCatchLocationSpeciesComparison(
        $('chart-comparison-avg-weight'),
        charts.comparisonAvgWeight,
        comparison,
        'avgWeightKg'
      );
      setEmpty('comparison-avg-weight', !charts.comparisonAvgWeight);

      charts.comparisonAvgLength = DashboardCharts.renderCatchLocationSpeciesComparison(
        $('chart-comparison-avg-length'),
        charts.comparisonAvgLength,
        comparison,
        'avgLengthMm'
      );
      setEmpty('comparison-avg-length', !charts.comparisonAvgLength);

      charts.comparisonSex = DashboardCharts.renderCatchLocationSexComparison(
        $('chart-comparison-sex'),
        charts.comparisonSex,
        comparison
      );
      setEmpty('comparison-sex', !charts.comparisonSex);
    } catch (err) {
      console.error('Vertailujen haku epäonnistui:', err);
      throw err;
    }
  }

  async function refreshScatter(filters) {
    try {
      const result = await FishApi.listObservations(filters, { limit: 200, offset: 0 });
      const observations = (result && result.data) || [];
      charts.scatter = DashboardCharts.renderScatter($('chart-scatter'), charts.scatter, observations);
      setEmpty('scatter', !charts.scatter);
      const usable = observations.filter(function (o) { return o.lengthMm != null && o.weightG != null; }).length;
      $('meta-scatter').textContent = usable > 0 ? 'n=' + usable + ' / ' + observations.length : '';
    } catch (err) {
      console.error('Scatter: haku epäonnistui:', err);
      throw err;
    }
  }

  function renderTableRows(rows) {
    const tbody = dom.tableBody;
    tbody.innerHTML = '';

    if (!rows.length) {
      const tr = document.createElement('tr');
      tr.className = 'empty-row';
      const td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = 'Ei havaintoja valitulla suodattimella.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    rows.forEach(function (row) {
      const tr = document.createElement('tr');

      const cells = [
        formatDateTime(row.observedAt),
        row.species ? row.species.finnishName : '–',
        row.sortingUnit ? row.sortingUnit.name : '–',
        row.sex === 'male' ? 'Koiras' : row.sex === 'female' ? 'Naaras' : 'Ei tiedossa'
      ];

      cells.forEach(function (text) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });

      const numCells = [
        row.lengthMm != null ? formatNumber(row.lengthMm) : '–',
        row.weightG != null ? formatNumber(row.weightG) : '–',
        row.aiConfidence != null ? Number(row.aiConfidence).toFixed(2).replace('.', ',') : '–'
      ];

      numCells.forEach(function (text) {
        const td = document.createElement('td');
        td.className = 'num';
        td.textContent = text;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  async function refreshTable(filters) {
    try {
      const result = await FishApi.listObservations(filters, {
        limit: state.pagination.limit,
        offset: state.pagination.offset
      });

      const rows = (result && result.data) || [];
      const pagination = (result && result.pagination) || { total: 0, limit: state.pagination.limit, offset: state.pagination.offset };

      state.pagination.total = pagination.total;
      renderTableRows(rows);

      const start = pagination.total === 0 ? 0 : pagination.offset + 1;
      const end = Math.min(pagination.offset + pagination.limit, pagination.total);
      dom.tableInfo.textContent = pagination.total === 0
        ? 'Ei rivejä'
        : start + '–' + end + ' / ' + pagination.total;

      dom.tablePrev.disabled = pagination.offset <= 0;
      dom.tableNext.disabled = pagination.offset + pagination.limit >= pagination.total;
    } catch (err) {
      console.error('Taulukon haku epäonnistui:', err);
      throw err;
    }
  }

  async function refreshAll() {
    readFilterUI();
    setStatus('Päivitetään…');

    const filters = activeFilters();
    state.pagination.offset = 0;

    try {
      await Promise.all([
        refreshKPIs(filters),
        refreshTimelineCharts(filters),
        refreshDistributions(filters),
        refreshCategoryDistributions(filters),
        refreshComparisons(filters),
        refreshScatter(filters),
        refreshTable(filters)
      ]);

      setStatus('Päivitetty ' + new Date().toLocaleTimeString('fi-FI'));
    } catch (err) {
      setStatus(err.message || 'Päivitys epäonnistui.', true);
    }
  }

  async function refreshTopSpeciesChart() {
    try {
      const filters = activeFilters();
      const summary = await FishApi.statsSummary(filters, 'species');
      charts.topSpecies = DashboardCharts.renderTopSpecies($('chart-top-species'), charts.topSpecies, summary, 10);
      setEmpty('top-species', !charts.topSpecies);
    } catch (err) {
      console.error('Top-species: haku epäonnistui:', err);
    }
  }

  function bindEvents() {
    dom.apply.addEventListener('click', function () {
      refreshAll().then(refreshTopSpeciesChart);
    });

    dom.reset.addEventListener('click', function () {
      const range = defaultDateRange();
      dom.from.value = range.from;
      dom.to.value = range.to;
      dom.speciesDropdown.setSelected([]);
      dom.sortingUnitDropdown.setSelected([]);
      dom.catchLocationDropdown.setSelected([]);
      updateBatchDropdownOptions();
      dom.batchDropdown.setSelected([]);
      dom.sex.value = '';
      refreshAll().then(refreshTopSpeciesChart);
    });

    dom.timelineGranularity.addEventListener('change', function () {
      state.timelineGranularity = dom.timelineGranularity.value;
      refreshOverallTimeline(activeFilters()).catch(function (err) {
        setStatus(err.message || 'Aikajanan päivitys epäonnistui.', true);
      });
    });

    dom.timelineSpeciesGranularity.addEventListener('change', function () {
      state.timelineSpeciesGranularity = dom.timelineSpeciesGranularity.value;
      refreshSpeciesTimeline(activeFilters()).catch(function (err) {
        setStatus(err.message || 'Lajijakauman aikajanan päivitys epäonnistui.', true);
      });
    });

    dom.tablePrev.addEventListener('click', function () {
      if (state.pagination.offset <= 0) return;
      state.pagination.offset = Math.max(0, state.pagination.offset - state.pagination.limit);
      refreshTable(activeFilters());
    });

    dom.tableNext.addEventListener('click', function () {
      if (state.pagination.offset + state.pagination.limit >= state.pagination.total) return;
      state.pagination.offset += state.pagination.limit;
      refreshTable(activeFilters());
    });
  }

  async function init() {
    dom.from = $('filter-from');
    dom.to = $('filter-to');
    dom.sex = $('filter-sex');
    dom.apply = $('filter-apply');
    dom.reset = $('filter-reset');
    dom.status = $('filter-status');
    dom.timelineGranularity = $('timeline-granularity');
    dom.timelineSpeciesGranularity = $('timeline-species-granularity');
    dom.tableBody = document.querySelector('#observations-table tbody');
    dom.tableInfo = $('table-info');
    dom.tablePrev = $('table-prev');
    dom.tableNext = $('table-next');

    dom.speciesDropdown = createMultiDropdown($('filter-species'), {
      allLabel: 'Kaikki lajit',
      itemLabel: 'lajia valittu'
    });
    dom.sortingUnitDropdown = createMultiDropdown($('filter-sorting-unit'), {
      allLabel: 'Kaikki lajitteluyksiköt',
      itemLabel: 'lajitteluyksikköä valittu'
    });
    dom.catchLocationDropdown = createMultiDropdown($('filter-catch-location'), {
      allLabel: 'Kaikki saalispaikat',
      itemLabel: 'saalispaikkaa valittu'
    });
    dom.batchDropdown = createMultiDropdown($('filter-batch'), {
      allLabel: 'Kaikki erät',
      itemLabel: 'erää valittu'
    });
    dom.catchLocationDropdown.onChange(function () {
      updateBatchDropdownOptions();
    });

    const range = defaultDateRange();
    dom.from.value = range.from;
    dom.to.value = range.to;
    state.timelineGranularity = dom.timelineGranularity.value;
    state.timelineSpeciesGranularity = dom.timelineSpeciesGranularity.value;

    bindEvents();

    setStatus('Ladataan…');
    await loadFilterOptions();
    await refreshAll();
    await refreshTopSpeciesChart();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
