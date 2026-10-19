'use strict';

(function () {
  const EXPORT_MAX_ROWS = 10000;
  const EXPORT_PAGE_SIZE = 500;

  const OBSERVATION_COLUMNS = [
    'Aika', 'Laji', 'Lajitteluyksikkö', 'Sukupuoli',
    'Pituus (mm)', 'Paino (g)', 'AI-luottamus'
  ];

  const CHART_BG = '#0f1117';
  const CARD_BG = '#1a2332';
  const TEXT = '#e2e8f0';
  const TEXT_MUTED = '#a0aec0';
  const TEXT_DIM = '#718096';
  const ACCENT = '#63b3ed';

  function $(id) {
    return document.getElementById(id);
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

  function dateLabel() {
    const from = $('filter-from').value;
    const to = $('filter-to').value;
    if (from && to) return from + ' – ' + to;
    if (from) return from + ' eteenpäin';
    if (to) return to + ' asti';
    return 'kaikki aikajaksot';
  }

  function filterSummary() {
    const parts = ['Aikajakso: ' + dateLabel()];

    const dropdowns = [
      { id: 'filter-species', label: 'Lajit' },
      { id: 'filter-sorting-unit', label: 'Lajitteluyksiköt' },
      { id: 'filter-catch-location', label: 'Saalispaikat' },
      { id: 'filter-batch', label: 'Erät' }
    ];
    dropdowns.forEach(function (d) {
      const root = $(d.id);
      const label = root.querySelector('.multi-dropdown__label');
      const isPlaceholder = label.classList.contains('multi-dropdown__label--placeholder');
      if (!isPlaceholder) {
        parts.push(d.label + ': ' + label.textContent);
      }
    });

    const sex = $('filter-sex').value;
    if (sex) {
      const option = $('filter-sex').selectedOptions[0];
      parts.push('Sukupuoli: ' + (option ? option.textContent : sex));
    }

    return parts.join('  ·  ');
  }

  function statValue(key) {
    const el = document.querySelector('[data-stat="' + key + '"]');
    return el ? el.textContent : '–';
  }

  function collectCharts() {
    const cards = [];
    document.querySelectorAll('.chart-card').forEach(function (card) {
      const titleEl = card.querySelector('.chart-header h3');
      const canvas = card.querySelector('canvas');
      const emptyEl = card.querySelector('.chart-empty');
      const isEmpty = emptyEl && !emptyEl.hidden;
      if (!titleEl || !canvas || isEmpty) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) return;
      cards.push({
        title: titleEl.textContent,
        canvas: canvas,
        wide: card.classList.contains('chart-card--wide'),
        tall: !!card.querySelector('.chart-wrap--tall')
      });
    });
    return cards;
  }

  function drawTextFit(ctx, text, x, y, maxWidth) {
    ctx.save();
    ctx.font = '11px "Segoe UI", system-ui, sans-serif';
    if (ctx.measureText(text).width <= maxWidth) {
      ctx.fillText(text, x, y);
      ctx.restore();
      return;
    }
    let t = text;
    while (t.length > 4 && ctx.measureText(t + '…').width > maxWidth) {
      t = t.slice(0, -1);
    }
    ctx.fillText(t + '…', x, y);
    ctx.restore();
  }

  function drawTextShrink(ctx, text, x, y, maxWidth, maxSize, minSize) {
    let size = maxSize;
    while (size >= minSize) {
      ctx.font = '600 ' + size + 'px "Segoe UI", system-ui, sans-serif';
      if (ctx.measureText(text).width <= maxWidth) {
        ctx.fillText(text, x, y);
        return;
      }
      size -= 1;
    }
    ctx.font = '600 ' + minSize + 'px "Segoe UI", system-ui, sans-serif';
    drawTextFit(ctx, text, x, y, maxWidth);
  }

  function drawImageFit(ctx, img, x, y, w, h) {
    const iw = img.width;
    const ih = img.height;
    if (!iw || !ih) return;
    const scale = Math.min(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function buildReport() {
    const kpis = [
      { label: 'Havaintoja', value: statValue('count'), sub: '' },
      { label: 'Kokonaispaino', value: statValue('totalWeight'), sub: 'kg' },
      { label: 'Pituus, ka.', value: statValue('avgLength'), sub: 'mm' },
      { label: 'Paino, ka.', value: statValue('avgWeight'), sub: 'g' },
      { label: 'Lajeja', value: statValue('speciesCount'), sub: '' },
      { label: 'Lajitteluyksiköitä', value: statValue('sortingUnitCount'), sub: '' }
    ];

    const charts = collectCharts();
    if (!charts.length) {
      throw new Error('Ei graafeja vietäväksi. Päivitä kojelauta ensin.');
    }

    const MARGIN = 48;
    const WIDTH = 1800;
    const CONTENT_W = WIDTH - MARGIN * 2;

    const HEADER_H = 150;
    const KPI_H = 100;
    const KPI_GAP = 16;
    const CARD_PAD = 20;
    const TITLE_H = 28;
    const GAP = 24;
    const FOOTER_H = 60;

    const CHART_H = 400;
    const CHART_H_TALL = 580;

    const rows = [];
    let pending = null;
    charts.forEach(function (chart) {
      if (chart.wide) {
        if (pending) {
          rows.push({ cards: [pending] });
          pending = null;
        }
        rows.push({ cards: [chart] });
      } else if (pending) {
        rows.push({ cards: [pending, chart] });
        pending = null;
      } else {
        pending = chart;
      }
    });
    if (pending) {
      rows.push({ cards: [pending] });
    }

    let totalHeight = MARGIN + HEADER_H + GAP + KPI_H + GAP;
    rows.forEach(function (row) {
      const tallest = Math.max.apply(null, row.cards.map(function (c) {
        return (c.tall ? CHART_H_TALL : CHART_H) + CARD_PAD + TITLE_H;
      }));
      totalHeight += tallest + GAP;
    });
    totalHeight += FOOTER_H + MARGIN;

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = CHART_BG;
    ctx.fillRect(0, 0, WIDTH, totalHeight);

    let y = MARGIN;

    // Header
    ctx.fillStyle = CARD_BG;
    ctx.fillRect(MARGIN, y, CONTENT_W, HEADER_H - GAP);
    ctx.fillStyle = ACCENT;
    ctx.font = '700 30px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('AI Fish Sort – kojelautaraportti', MARGIN + 24, y + 44);
    ctx.fillStyle = TEXT_MUTED;
    drawTextShrink(ctx, filterSummary(), MARGIN + 24, y + 72, CONTENT_W - 48, 14, 9);
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText('Laadittu: ' + formatDateTime(new Date().toISOString()), MARGIN + 24, y + 96);

    y += HEADER_H;

    // KPI row
    const kpiW = (CONTENT_W - KPI_GAP * (kpis.length - 1)) / kpis.length;
    kpis.forEach(function (kpi, i) {
      const x = MARGIN + i * (kpiW + KPI_GAP);
      ctx.fillStyle = CARD_BG;
      ctx.fillRect(x, y, kpiW, KPI_H);
      ctx.fillStyle = TEXT_DIM;
      drawTextShrink(ctx, kpi.label.toUpperCase(), x + 16, y + 26, kpiW - 32, 10, 7);
      ctx.fillStyle = TEXT;
      ctx.font = '700 26px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(kpi.value, x + 16, y + 62);
      if (kpi.sub) {
        const w = ctx.measureText(kpi.value).width;
        ctx.fillStyle = TEXT_MUTED;
        ctx.font = '500 13px "Segoe UI", system-ui, sans-serif';
        ctx.fillText(' ' + kpi.sub, x + 16 + w, y + 62);
      }
    });
    y += KPI_H + GAP;

    // Chart rows
    rows.forEach(function (row) {
      const count = row.cards.length;
      const rowGap = 24;
      const cardW = (CONTENT_W - rowGap * (count - 1)) / count;
      const cardH = Math.max.apply(null, row.cards.map(function (c) {
        return (c.tall ? CHART_H_TALL : CHART_H) + CARD_PAD + TITLE_H;
      }));

      row.cards.forEach(function (chart, i) {
        const x = MARGIN + i * (cardW + rowGap);

        ctx.fillStyle = CARD_BG;
        ctx.fillRect(x, y, cardW, cardH);

        ctx.fillStyle = TEXT;
        drawTextShrink(ctx, chart.title, x + CARD_PAD, y + CARD_PAD + 9, cardW - CARD_PAD * 2, 15, 10);

        const innerX = x + CARD_PAD;
        const innerY = y + CARD_PAD + TITLE_H;
        const innerW = cardW - CARD_PAD * 2;
        const innerH = cardH - CARD_PAD - TITLE_H;

        ctx.fillStyle = CHART_BG;
        ctx.fillRect(innerX, innerY, innerW, innerH);
        drawImageFit(ctx, chart.canvas, innerX, innerY, innerW, innerH);
      });

      y += cardH + GAP;
    });

    // Footer
    ctx.fillStyle = TEXT_DIM;
    ctx.font = '11px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Lähde: AI Fish Sort /api/v1-rajapinta. Raportti luotu automaattisesti kojelaudasta.', MARGIN, y + 20);

    return canvas;
  }

  function timestampSlug() {
    const d = new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function setButtonState(btn, busyText) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = busyText;
    return function () {
      btn.disabled = false;
      btn.textContent = original;
    };
  }

  async function exportReport() {
    const btn = $('export-report');
    const done = setButtonState(btn, 'Laadin raporttia…');
    try {
      await new Promise(function (resolve) { requestAnimationFrame(resolve); });
      const canvas = buildReport();
      const blob = await new Promise(function (resolve, reject) {
        canvas.toBlob(function (b) {
          if (b) resolve(b); else reject(new Error('PNG-vienti epäonnistui.'));
        }, 'image/png');
      });
      downloadBlob(blob, 'aifishsort-raportti-' + timestampSlug() + '.png');
    } catch (err) {
      alert(err.message || 'Raportin vienti epäonnistui.');
    } finally {
      done();
    }
  }

  function csvCell(value) {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (/[;\n\r"]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function sexLabel(sex) {
    return sex === 'male' ? 'Koiras' : sex === 'female' ? 'Naaras' : 'Ei tiedossa';
  }

  function buildObservationFilters() {
    const speciesSel = collectSelected('filter-species');
    const unitSel = collectSelected('filter-sorting-unit');
    const locSel = collectSelected('filter-catch-location');
    const batchSel = collectSelected('filter-batch');
    const sex = $('filter-sex').value;

    const params = {};
    if ($('filter-from').value) params.from = $('filter-from').value + 'T00:00:00.000Z';
    if ($('filter-to').value) params.to = $('filter-to').value + 'T23:59:59.999Z';
    if (speciesSel.length) params.speciesId = speciesSel.join(',');
    if (unitSel.length) params.sortingUnitId = unitSel.join(',');
    if (locSel.length) params.catchLocationId = locSel.join(',');
    if (batchSel.length) params.batchId = batchSel.join(',');
    if (sex) params.sex = sex;

    return params;
  }

  async function fetchObservationRows() {
    const filters = buildObservationFilters();
    const rows = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total && rows.length < EXPORT_MAX_ROWS) {
      const result = await FishApi.listObservations(filters, {
        limit: EXPORT_PAGE_SIZE,
        offset: offset
      });
      const data = (result && result.data) || [];
      const pagination = (result && result.pagination) || {};
      total = typeof pagination.total === 'number' ? pagination.total : rows.length + data.length;
      rows.push.apply(rows, data);
      offset += data.length;
      if (!data.length) break;
    }

    return rows;
  }

  async function exportCsv() {
    const btn = $('export-csv');
    const done = setButtonState(btn, 'Vien CSV…');
    try {
      const rows = await fetchObservationRows();

      const lines = [OBSERVATION_COLUMNS.join(';')];
      rows.forEach(function (row) {
        lines.push([
          csvCell(row.observedAt),
          csvCell(row.species ? row.species.finnishName : ''),
          csvCell(row.sortingUnit ? row.sortingUnit.name : ''),
          csvCell(sexLabel(row.sex)),
          csvCell(row.lengthMm),
          csvCell(row.weightG),
          csvCell(row.aiConfidence != null ? Number(row.aiConfidence).toFixed(4).replace('.', ',') : '')
        ].join(';'));
      });

      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, 'aifishsort-havainnot-' + timestampSlug() + '.csv');
    } catch (err) {
      alert(err.message || 'CSV-vienti epäonnistui.');
    } finally {
      done();
    }
  }

  function buildXlsxSheet(rows) {
    const data = [OBSERVATION_COLUMNS.slice()];
    rows.forEach(function (row) {
      data.push([
        row.observedAt || '',
        row.species ? row.species.finnishName : '',
        row.sortingUnit ? row.sortingUnit.name : '',
        sexLabel(row.sex),
        row.lengthMm != null ? Number(row.lengthMm) : null,
        row.weightG != null ? Number(row.weightG) : null,
        row.aiConfidence != null ? Number(row.aiConfidence) : null
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [
      { wch: 22 }, { wch: 24 }, { wch: 28 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }
    ];
    sheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(data.length - 1, 0), c: OBSERVATION_COLUMNS.length - 1 }
      })
    };

    return sheet;
  }

  async function exportXlsx() {
    const btn = $('export-xlsx');
    const done = setButtonState(btn, 'Vien XLSX…');
    try {
      if (typeof XLSX === 'undefined') {
        throw new Error('XLSX-kirjaston lataus epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.');
      }

      const rows = await fetchObservationRows();
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, buildXlsxSheet(rows), 'Havainnot');

      const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true });
      const blob = new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      downloadBlob(blob, 'aifishsort-havainnot-' + timestampSlug() + '.xlsx');
    } catch (err) {
      alert(err.message || 'XLSX-vienti epäonnistui.');
    } finally {
      done();
    }
  }

  function collectSelected(dropdownId) {
    const root = $(dropdownId);
    if (!root) return [];
    const boxes = root.querySelectorAll('.multi-dropdown__list input[type="checkbox"]:checked');
    return Array.from(boxes).map(function (b) { return b.value; });
  }

  function init() {
    const reportBtn = $('export-report');
    const csvBtn = $('export-csv');
    const xlsxBtn = $('export-xlsx');
    if (reportBtn) reportBtn.addEventListener('click', exportReport);
    if (csvBtn) csvBtn.addEventListener('click', exportCsv);
    if (xlsxBtn) xlsxBtn.addEventListener('click', exportXlsx);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
