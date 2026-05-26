'use strict';

(function () {
  const API_BASE = '/api/v1';

  function buildQueryString(params) {
    const usp = new URLSearchParams();

    Object.keys(params || {}).forEach(function (key) {
      const value = params[key];

      if (value === null || value === undefined || value === '') {
        return;
      }

      if (Array.isArray(value)) {
        const cleaned = value.filter(function (v) {
          return v !== null && v !== undefined && v !== '';
        });
        if (cleaned.length > 0) {
          usp.set(key, cleaned.join(','));
        }
        return;
      }

      usp.set(key, String(value));
    });

    const qs = usp.toString();
    return qs ? '?' + qs : '';
  }

  async function fetchJson(path, params) {
    const url = API_BASE + path + buildQueryString(params);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' }
    });

    let body = null;
    try {
      body = await response.json();
    } catch (err) {
      body = null;
    }

    if (!response.ok) {
      const message = body && body.error && body.error.message
        ? body.error.message
        : 'Kutsu epäonnistui (' + response.status + ')';
      const error = new Error(message);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    return body;
  }

  const FishApi = {
    listSpecies: function () {
      return fetchJson('/species');
    },
    listSortingUnits: function () {
      return fetchJson('/sorting-units');
    },
    listCatchLocations: function () {
      return fetchJson('/catch-locations');
    },
    listBatches: function () {
      return fetchJson('/fish-batches', { limit: 200 });
    },
    listObservations: function (filters, pagination) {
      const params = Object.assign({}, filters, pagination || {});
      return fetchJson('/fish-observations', params);
    },
    statsCount: function (filters) {
      return fetchJson('/fish-stats/count', filters);
    },
    statsSummary: function (filters, groupBy, options) {
      const params = Object.assign({}, filters, options || {}, { groupBy: groupBy });
      return fetchJson('/fish-stats/summary', params);
    },
    statsTimeline: function (filters, granularity, groupBy, options) {
      const params = Object.assign({}, filters, options || {}, {
        granularity: granularity || 'day'
      });
      if (groupBy) {
        params.groupBy = groupBy;
      }
      return fetchJson('/fish-stats/timeline', params);
    },
    statsDistribution: function (filters, metric, bins) {
      const params = Object.assign({}, filters, {
        metric: metric,
        bins: bins || 20
      });
      return fetchJson('/fish-stats/distribution', params);
    },
    statsComparison: function (filters, dimension) {
      const params = Object.assign({}, filters, {
        dimension: dimension || 'catchLocation'
      });
      return fetchJson('/fish-stats/comparison', params);
    }
  };

  window.FishApi = FishApi;
})();
