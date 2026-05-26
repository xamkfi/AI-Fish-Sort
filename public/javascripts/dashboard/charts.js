'use strict';

(function () {
  const PALETTE = [
    '#63b3ed', '#68d391', '#f6ad55', '#fc8181', '#b794f4',
    '#4fd1c5', '#f687b3', '#fbd38d', '#9ae6b4', '#90cdf4',
    '#d6bcfa', '#feb2b2', '#fbb6ce', '#bee3f8', '#c6f6d5'
  ];

  const SEX_COLORS = {
    male: '#63b3ed',
    female: '#f687b3',
    unknown: '#a0aec0'
  };

  const SEX_LABELS = {
    male: 'Koiras',
    female: 'Naaras',
    unknown: 'Ei tiedossa'
  };
  const SEX_LABELS_LOWER = {
    male: 'koiras',
    female: 'naaras',
    unknown: 'ei tiedossa'
  };
  const BREAKDOWN_SEX_GROUPS = [
    { value: 'male', label: 'koiraat' },
    { value: 'female', label: 'naaraat' },
    { value: 'unknown', label: 'ei tiedossa' }
  ];
  const MAX_TOOLTIP_BREAKDOWN_ROWS = 18;

  const COMMON_SCALE_OPTS = {
    grid: { color: 'rgba(45, 55, 72, 0.6)', drawTicks: false },
    border: { color: 'rgba(45, 55, 72, 0.6)' },
    ticks: { color: '#a0aec0', font: { size: 11 } }
  };

  const TOOLTIP_OPTS = {
    backgroundColor: '#1a2332',
    titleColor: '#e2e8f0',
    bodyColor: '#e2e8f0',
    borderColor: '#4a5568',
    borderWidth: 1,
    padding: 10,
    titleFont: { size: 12, weight: '600' },
    bodyFont: { size: 12 }
  };

  function colorAt(index) {
    return PALETTE[index % PALETTE.length];
  }

  function destroyIfExists(chart) {
    if (chart) {
      const tooltip = chart.canvas.parentNode && chart.canvas.parentNode.querySelector('.chart-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
      chart.destroy();
    }
    return null;
  }

  function baseLineOptions(extra) {
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#a0aec0', font: { size: 11 } } },
        tooltip: TOOLTIP_OPTS
      },
      scales: {
        x: Object.assign({}, COMMON_SCALE_OPTS),
        y: Object.assign({}, COMMON_SCALE_OPTS, { beginAtZero: true })
      }
    };
    return Object.assign(base, extra || {});
  }

  function baseBarOptions(extra) {
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: TOOLTIP_OPTS
      },
      scales: {
        x: Object.assign({}, COMMON_SCALE_OPTS, { beginAtZero: true }),
        y: Object.assign({}, COMMON_SCALE_OPTS, { beginAtZero: true })
      }
    };
    return Object.assign(base, extra || {});
  }

  function formatWeight(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return 'ei painoa';
    }

    return String(Number(value)) + ' g';
  }

  function formatBreakdownLine(item) {
    const species = item.species && item.species.finnishName
      ? item.species.finnishName
      : 'Tuntematon laji';

    return species + ', ' + formatWeight(item.weightG) + ': ' + item.count + ' kpl';
  }

  function formatFiNumber(value, decimals) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '–';
    }

    const options = {};
    if (decimals !== undefined) {
      options.minimumFractionDigits = decimals;
      options.maximumFractionDigits = decimals;
    }

    return Number(value).toLocaleString('fi-FI', options);
  }

  function comparisonMetricValue(row, metric) {
    if (metric === 'count') {
      return Number(row.count || 0);
    }
    if (metric === 'totalWeightKg') {
      if (row.totalWeightKg !== null && row.totalWeightKg !== undefined) {
        return Number(row.totalWeightKg);
      }
      return row.totalWeightG === null || row.totalWeightG === undefined
        ? null
        : Number(row.totalWeightG) / 1000;
    }
    if (metric === 'avgWeightKg') {
      return row.avgWeightG === null || row.avgWeightG === undefined
        ? null
        : Number(row.avgWeightG) / 1000;
    }
    if (metric === 'avgLengthMm') {
      return row.avgLengthMm === null || row.avgLengthMm === undefined
        ? null
        : Number(row.avgLengthMm);
    }

    return null;
  }

  function comparisonMetricConfig(metric) {
    const configs = {
      count: { axisLabel: 'kpl', decimals: 0, stacked: true, unit: ' kpl' },
      totalWeightKg: { axisLabel: 'kg', decimals: 2, stacked: true, unit: ' kg' },
      avgWeightKg: { axisLabel: 'kg', decimals: 2, stacked: false, unit: ' kg' },
      avgLengthMm: { axisLabel: 'mm', decimals: 0, stacked: false, unit: ' mm' }
    };

    return configs[metric] || configs.count;
  }

  function formatComparisonValue(value, metric) {
    const config = comparisonMetricConfig(metric);
    return formatFiNumber(value, config.decimals) + config.unit;
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function groupedBreakdownSections(breakdown) {
    const sections = [];
    let visibleCount = 0;

    BREAKDOWN_SEX_GROUPS.forEach(function (group) {
      const items = breakdown.filter(function (item) {
        const sex = item.sex || 'unknown';
        return sex === group.value;
      });

      if (!items.length || visibleCount >= MAX_TOOLTIP_BREAKDOWN_ROWS) {
        return;
      }

      const section = {
        label: group.label,
        rows: []
      };

      items.slice(0, MAX_TOOLTIP_BREAKDOWN_ROWS - visibleCount).forEach(function (item) {
        section.rows.push(formatBreakdownLine(item));
        visibleCount += 1;
      });

      sections.push(section);
    });

    return {
      hiddenCount: breakdown.length - visibleCount,
      sections: sections
    };
  }

  function getOrCreateTooltip(chart) {
    const parent = chart.canvas.parentNode;
    let tooltip = parent.querySelector('.chart-tooltip');

    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'chart-tooltip';
      parent.appendChild(tooltip);
    }

    return tooltip;
  }

  function tooltipPointValue(point, valueReader) {
    if (typeof valueReader === 'function') {
      return valueReader(point);
    }

    if (point.parsed && point.parsed.x !== undefined) {
      return point.parsed.x;
    }

    return point.parsed ? point.parsed.y : '';
  }

  function tooltipPointColor(point) {
    const backgroundColor = point.dataset.backgroundColor;
    const borderColor = point.dataset.borderColor;

    if (Array.isArray(backgroundColor)) {
      return backgroundColor[point.dataIndex];
    }
    if (backgroundColor) {
      return backgroundColor;
    }
    if (Array.isArray(borderColor)) {
      return borderColor[point.dataIndex];
    }

    return borderColor || '#a0aec0';
  }

  function renderBreakdownTooltip(context, rows, valueReader) {
    const tooltipModel = context.tooltip;
    const tooltip = getOrCreateTooltip(context.chart);

    if (tooltipModel.opacity === 0) {
      tooltip.style.opacity = 0;
      return;
    }

    const point = tooltipModel.dataPoints && tooltipModel.dataPoints[0];
    if (!point) {
      tooltip.style.opacity = 0;
      return;
    }

    const row = rows[point.dataIndex] || {};
    const breakdown = Array.isArray(row.breakdown) ? row.breakdown : [];
    const pointValue = tooltipPointValue(point, valueReader);
    const pointColor = tooltipPointColor(point);
    const grouped = groupedBreakdownSections(breakdown);
    const groupsHtml = grouped.sections.map(function (section, index) {
      const divider = index > 0 ? '<div class="chart-tooltip__divider"></div>' : '';
      const rowsHtml = section.rows.map(function (line) {
        return '<div class="chart-tooltip__row">' + escapeHtml(line) + '</div>';
      }).join('');

      return divider
        + '<div class="chart-tooltip__group-title"><strong>' + escapeHtml(section.label) + '</strong></div>'
        + rowsHtml;
    }).join('');
    const hiddenHtml = grouped.hiddenCount > 0
      ? '<div class="chart-tooltip__more">+' + grouped.hiddenCount + ' riviä</div>'
      : '';

    tooltip.innerHTML = ''
      + '<div class="chart-tooltip__title">' + escapeHtml(point.label) + '</div>'
      + '<div class="chart-tooltip__count">'
      +   '<span class="chart-tooltip__swatch" style="background:' + escapeHtml(pointColor) + '"></span>'
      +   '<span>Havainnot: ' + escapeHtml(pointValue) + ' kpl</span>'
      + '</div>'
      + groupsHtml
      + hiddenHtml;

    tooltip.style.opacity = 1;
    tooltip.style.left = tooltipModel.caretX + 'px';
    tooltip.style.top = tooltipModel.caretY + 'px';
  }

  function breakdownTooltipOptions(rows, valueReader) {
    return Object.assign({}, TOOLTIP_OPTS, {
      enabled: false,
      external: function (context) {
        renderBreakdownTooltip(context, rows, valueReader);
      }
    });
  }

  function baseDoughnutOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#a0aec0', font: { size: 11 } } },
        tooltip: Object.assign({}, TOOLTIP_OPTS, {
          callbacks: {
            label: function (ctx) {
              const total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
              return ctx.label + ': ' + ctx.parsed + ' (' + pct + ' %)';
            }
          }
        })
      }
    };
  }

  function renderTimeline(canvas, existing, payload) {
    const data = (payload && payload.data) || [];

    if (!data.length) {
      return destroyIfExists(existing);
    }

    const options = baseLineOptions();
    options.plugins.tooltip = breakdownTooltipOptions(data, function (point) {
      return point.parsed ? point.parsed.y : '';
    });

    const config = {
      type: 'line',
      data: {
        labels: data.map(function (row) { return row.bucket; }),
        datasets: [{
          label: 'Havainnot',
          data: data.map(function (row) { return row.count; }),
          borderColor: PALETTE[0],
          backgroundColor: 'rgba(99, 179, 237, 0.15)',
          borderWidth: 2,
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: options
    };

    if (existing) {
      existing.data = config.data;
      existing.options = config.options;
      existing.update('none');
      return existing;
    }

    return new Chart(canvas.getContext('2d'), config);
  }

  function renderTimelineSpecies(canvas, existing, payload) {
    const data = (payload && payload.data) || [];

    if (!data.length) {
      return destroyIfExists(existing);
    }

    const buckets = Array.from(new Set(data.map(function (r) { return r.bucket; }))).sort();
    const speciesMap = new Map();

    data.forEach(function (row) {
      if (!row.group || !row.group.id) {
        return;
      }
      if (!speciesMap.has(row.group.id)) {
        speciesMap.set(row.group.id, {
          name: row.group.name || 'Tuntematon',
          values: new Map()
        });
      }
      speciesMap.get(row.group.id).values.set(row.bucket, row.count);
    });

    const speciesEntries = Array.from(speciesMap.entries()).map(function (entry) {
      const id = entry[0];
      const info = entry[1];
      const total = Array.from(info.values.values()).reduce(function (a, b) { return a + b; }, 0);
      return { id: id, name: info.name, values: info.values, total: total };
    }).sort(function (a, b) { return b.total - a.total; });

    const TOP = 8;
    const top = speciesEntries.slice(0, TOP);
    const rest = speciesEntries.slice(TOP);

    const datasets = top.map(function (entry, i) {
      return {
        label: entry.name,
        data: buckets.map(function (b) { return entry.values.get(b) || 0; }),
        backgroundColor: colorAt(i),
        borderWidth: 0,
        stack: 'species'
      };
    });

    if (rest.length > 0) {
      const restValues = buckets.map(function (b) {
        return rest.reduce(function (sum, e) { return sum + (e.values.get(b) || 0); }, 0);
      });
      datasets.push({
        label: 'Muut (' + rest.length + ')',
        data: restValues,
        backgroundColor: '#4a5568',
        borderWidth: 0,
        stack: 'species'
      });
    }

    const config = {
      type: 'bar',
      data: { labels: buckets, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#a0aec0', font: { size: 11 } } },
          tooltip: TOOLTIP_OPTS
        },
        scales: {
          x: Object.assign({}, COMMON_SCALE_OPTS, { stacked: true }),
          y: Object.assign({}, COMMON_SCALE_OPTS, { stacked: true, beginAtZero: true })
        }
      }
    };

    if (existing) {
      existing.data = config.data;
      existing.options = config.options;
      existing.update('none');
      return existing;
    }

    return new Chart(canvas.getContext('2d'), config);
  }

  function renderTopSpecies(canvas, existing, payload, topN) {
    const rows = ((payload && payload.data) || [])
      .filter(function (r) { return r.species && r.species.id; })
      .slice()
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, topN || 10);

    if (!rows.length) {
      return destroyIfExists(existing);
    }

    const config = {
      type: 'bar',
      data: {
        labels: rows.map(function (r) { return r.species.finnishName; }),
        datasets: [{
          label: 'Havainnot',
          data: rows.map(function (r) { return r.count; }),
          backgroundColor: rows.map(function (_, i) { return colorAt(i); }),
          borderWidth: 0
        }]
      },
      options: baseBarOptions({ indexAxis: 'y' })
    };

    if (existing) {
      existing.data = config.data;
      existing.options = config.options;
      existing.update('none');
      return existing;
    }

    return new Chart(canvas.getContext('2d'), config);
  }

  function renderSummaryBars(canvas, existing, payload, labelMapper, colorOffset) {
    const rows = ((payload && payload.data) || [])
      .filter(function (r) { return r.count > 0; })
      .slice()
      .sort(function (a, b) { return b.count - a.count; });

    if (!rows.length) {
      return destroyIfExists(existing);
    }

    const options = baseBarOptions({ indexAxis: 'y' });
    options.plugins.tooltip = breakdownTooltipOptions(rows);

    const config = {
      type: 'bar',
      data: {
        labels: rows.map(labelMapper),
        datasets: [{
          label: 'Havainnot',
          data: rows.map(function (r) { return r.count; }),
          rows: rows,
          backgroundColor: rows.map(function (_, i) { return colorAt(i + (colorOffset || 0)); }),
          borderWidth: 0
        }]
      },
      options: options
    };

    if (existing) {
      existing.data = config.data;
      existing.options = config.options;
      existing.update('none');
      return existing;
    }

    return new Chart(canvas.getContext('2d'), config);
  }

  function renderSortingUnits(canvas, existing, payload) {
    return renderSummaryBars(canvas, existing, payload, function (r) {
      return r.sortingUnit ? r.sortingUnit.name : 'Tuntematon';
    }, 3);
  }

  function renderCatchLocations(canvas, existing, payload) {
    return renderSummaryBars(canvas, existing, payload, function (r) {
      return r.catchLocation ? r.catchLocation.name : 'Tuntematon';
    }, 5);
  }

  function renderBatches(canvas, existing, payload) {
    return renderSummaryBars(canvas, existing, payload, function (r) {
      return r.batch ? r.batch.code : 'Tuntematon';
    }, 7);
  }

  function renderSex(canvas, existing, payload) {
    const rows = ((payload && payload.data) || []).filter(function (r) { return r.count > 0; });

    if (!rows.length) {
      return destroyIfExists(existing);
    }

    const config = {
      type: 'doughnut',
      data: {
        labels: rows.map(function (r) { return SEX_LABELS[r.sex] || r.sex; }),
        datasets: [{
          data: rows.map(function (r) { return r.count; }),
          backgroundColor: rows.map(function (r) { return SEX_COLORS[r.sex] || '#a0aec0'; }),
          borderColor: '#1a2332',
          borderWidth: 2
        }]
      },
      options: baseDoughnutOptions()
    };

    if (existing) {
      existing.data = config.data;
      existing.options = config.options;
      existing.update('none');
      return existing;
    }

    return new Chart(canvas.getContext('2d'), config);
  }

  function renderHistogram(canvas, existing, payload, color) {
    const data = payload && payload.data;
    const bins = (data && data.bins) || [];

    if (!bins.length) {
      return destroyIfExists(existing);
    }

    const labels = bins.map(function (b) {
      return Math.round(b.binStart) + '–' + Math.round(b.binEnd);
    });

    const config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Havainnot',
          data: bins.map(function (b) { return b.count; }),
          backgroundColor: color || PALETTE[0],
          borderWidth: 0,
          barPercentage: 1.0,
          categoryPercentage: 0.95
        }]
      },
      options: baseBarOptions()
    };

    if (existing) {
      existing.data = config.data;
      existing.options = config.options;
      existing.update('none');
      return existing;
    }

    return new Chart(canvas.getContext('2d'), config);
  }

  function renderCatchLocationSpeciesComparison(canvas, existing, payload, metric) {
    const metricConfig = comparisonMetricConfig(metric);
    const rows = ((payload && payload.data && payload.data.speciesByCatchLocation) || [])
      .filter(function (row) {
        return row.catchLocation && row.catchLocation.id && row.species && row.species.id;
      })
      .map(function (row) {
        return Object.assign({}, row, {
          metricValue: comparisonMetricValue(row, metric)
        });
      })
      .filter(function (row) {
        return row.metricValue !== null
          && row.metricValue !== undefined
          && Number.isFinite(row.metricValue);
      });

    if (!rows.length) {
      return destroyIfExists(existing);
    }

    const locationMap = new Map();
    const speciesMap = new Map();
    const values = new Map();

    rows.forEach(function (row) {
      if (!locationMap.has(row.catchLocation.id)) {
        locationMap.set(row.catchLocation.id, {
          id: row.catchLocation.id,
          name: row.catchLocation.name || 'Tuntematon'
        });
      }

      if (!speciesMap.has(row.species.id)) {
        speciesMap.set(row.species.id, {
          id: row.species.id,
          name: row.species.finnishName || 'Tuntematon',
          total: 0
        });
      }

      speciesMap.get(row.species.id).total += row.metricValue || 0;
      values.set(row.catchLocation.id + '|' + row.species.id, row.metricValue);
    });

    const locations = Array.from(locationMap.values()).sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    const species = Array.from(speciesMap.values()).sort(function (a, b) {
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      return a.name.localeCompare(b.name);
    });

    const datasets = species.map(function (entry, index) {
      return {
        label: entry.name,
        data: locations.map(function (location) {
          const value = values.get(location.id + '|' + entry.id);
          return value === undefined ? null : value;
        }),
        backgroundColor: colorAt(index),
        borderWidth: 0,
        stack: metricConfig.stacked ? 'comparison' : undefined
      };
    });

    const options = baseBarOptions({ indexAxis: 'y' });
    options.plugins.legend = { labels: { color: '#a0aec0', font: { size: 11 } } };
    options.plugins.tooltip = Object.assign({}, TOOLTIP_OPTS, {
      callbacks: {
        label: function (ctx) {
          return ctx.dataset.label + ': ' + formatComparisonValue(ctx.parsed.x, metric);
        }
      }
    });
    options.scales.x.stacked = metricConfig.stacked;
    options.scales.y.stacked = metricConfig.stacked;
    options.scales.x.title = {
      display: true,
      text: metricConfig.axisLabel,
      color: '#a0aec0'
    };

    const config = {
      type: 'bar',
      data: {
        labels: locations.map(function (location) { return location.name; }),
        datasets: datasets
      },
      options: options
    };

    if (existing) {
      existing.data = config.data;
      existing.options = config.options;
      existing.update('none');
      return existing;
    }

    return new Chart(canvas.getContext('2d'), config);
  }

  function renderCatchLocationSexComparison(canvas, existing, payload) {
    const rows = ((payload && payload.data && payload.data.sexByCatchLocation) || [])
      .filter(function (row) {
        return row.catchLocation && row.catchLocation.id && row.count > 0;
      });

    if (!rows.length) {
      return destroyIfExists(existing);
    }

    const locationMap = new Map();
    const counts = new Map();

    rows.forEach(function (row) {
      const locationId = row.catchLocation.id;
      const sex = row.sex || 'unknown';
      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          id: locationId,
          name: row.catchLocation.name || 'Tuntematon',
          total: 0
        });
      }
      locationMap.get(locationId).total += Number(row.count || 0);
      counts.set(locationId + '|' + sex, Number(row.count || 0));
    });

    const locations = Array.from(locationMap.values())
      .filter(function (location) { return location.total > 0; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });

    if (!locations.length) {
      return destroyIfExists(existing);
    }

    const sexes = ['male', 'female', 'unknown'];
    const datasets = sexes.map(function (sex) {
      const rawCounts = locations.map(function (location) {
        return counts.get(location.id + '|' + sex) || 0;
      });

      return {
        label: SEX_LABELS[sex] || sex,
        data: locations.map(function (location, index) {
          return location.total > 0 ? (rawCounts[index] / location.total) * 100 : 0;
        }),
        rawCounts: rawCounts,
        backgroundColor: SEX_COLORS[sex] || '#a0aec0',
        borderWidth: 0,
        stack: 'sex'
      };
    });

    const options = baseBarOptions({ indexAxis: 'y' });
    options.plugins.legend = { labels: { color: '#a0aec0', font: { size: 11 } } };
    options.plugins.tooltip = Object.assign({}, TOOLTIP_OPTS, {
      callbacks: {
        label: function (ctx) {
          const count = ctx.dataset.rawCounts[ctx.dataIndex] || 0;
          return ctx.dataset.label + ': ' + formatFiNumber(ctx.parsed.x, 1) + ' % (' + count + ' kpl)';
        }
      }
    });
    options.scales.x.stacked = true;
    options.scales.x.max = 100;
    options.scales.x.title = { display: true, text: '%', color: '#a0aec0' };
    options.scales.y.stacked = true;

    const config = {
      type: 'bar',
      data: {
        labels: locations.map(function (location) { return location.name; }),
        datasets: datasets
      },
      options: options
    };

    if (existing) {
      existing.data = config.data;
      existing.options = config.options;
      existing.update('none');
      return existing;
    }

    return new Chart(canvas.getContext('2d'), config);
  }

  function renderScatter(canvas, existing, observations) {
    const groups = new Map();

    observations.forEach(function (obs) {
      if (obs.lengthMm == null || obs.weightG == null) {
        return;
      }
      const key = obs.species && obs.species.id ? obs.species.id : 'unknown';
      const name = obs.species && obs.species.finnishName ? obs.species.finnishName : 'Tuntematon';
      if (!groups.has(key)) {
        groups.set(key, { name: name, points: [] });
      }
      groups.get(key).points.push({
        x: obs.lengthMm,
        y: obs.weightG,
        sex: obs.sex || 'unknown'
      });
    });

    const datasets = Array.from(groups.values())
      .sort(function (a, b) { return b.points.length - a.points.length; })
      .map(function (g, i) {
        return {
          label: g.name,
          data: g.points,
          backgroundColor: colorAt(i),
          borderColor: colorAt(i),
          pointRadius: 3,
          pointHoverRadius: 5
        };
      });

    if (!datasets.length) {
      return destroyIfExists(existing);
    }

    const config = {
      type: 'scatter',
      data: { datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#a0aec0', font: { size: 11 } } },
          tooltip: Object.assign({}, TOOLTIP_OPTS, {
            callbacks: {
              label: function (ctx) {
                const sex = SEX_LABELS_LOWER[ctx.raw.sex] || 'ei tiedossa';
                return ctx.dataset.label + ', ' + sex + ': ' + ctx.parsed.x + ' mm, ' + ctx.parsed.y + ' g';
              }
            }
          })
        },
        scales: {
          x: Object.assign({}, COMMON_SCALE_OPTS, {
            title: { display: true, text: 'Pituus (mm)', color: '#a0aec0' }
          }),
          y: Object.assign({}, COMMON_SCALE_OPTS, {
            title: { display: true, text: 'Paino (g)', color: '#a0aec0' },
            beginAtZero: true
          })
        }
      }
    };

    if (existing) {
      existing.data = config.data;
      existing.options = config.options;
      existing.update('none');
      return existing;
    }

    return new Chart(canvas.getContext('2d'), config);
  }

  window.DashboardCharts = {
    PALETTE: PALETTE,
    destroyIfExists: destroyIfExists,
    renderTimeline: renderTimeline,
    renderTimelineSpecies: renderTimelineSpecies,
    renderTopSpecies: renderTopSpecies,
    renderSortingUnits: renderSortingUnits,
    renderCatchLocations: renderCatchLocations,
    renderBatches: renderBatches,
    renderSex: renderSex,
    renderHistogram: renderHistogram,
    renderCatchLocationSpeciesComparison: renderCatchLocationSpeciesComparison,
    renderCatchLocationSexComparison: renderCatchLocationSexComparison,
    renderScatter: renderScatter
  };
})();
