'use strict';

function getApiInfo() {
  return {
    name: 'AI Fish Sort API',
    version: 'v1',
    endpoints: [
      '/api/v1/species',
      '/api/v1/sorting-units',
      '/api/v1/catch-locations',
      '/api/v1/fish-batches',
      '/api/v1/fish-observations',
      '/api/v1/fish-stats/count',
      '/api/v1/fish-stats/summary',
      '/api/v1/fish-stats/timeline',
      '/api/v1/fish-stats/distribution',
      '/api/v1/fish-stats/comparison'
    ]
  };
}

function wantsHtml(req) {
  const accept = req.get('accept') || '';
  return req.query.format !== 'json' && accept.indexOf('text/html') !== -1;
}

function showIndex(req, res) {
  const apiInfo = getApiInfo();

  if (!wantsHtml(req)) {
    return res.json({ data: apiInfo });
  }

  return res.render('apiPortal', {
    layout: false,
    title: 'AI Fish Sort API'
  });
}

function info(req, res) {
  res.json({ data: getApiInfo() });
}

module.exports = {
  getApiInfo,
  info,
  showIndex
};
