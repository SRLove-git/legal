const create = require('../../services/list.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page(create({
  apiFn: api.getDeals,
  fallback: fb.deals,
  filter: function (it, kw) { return it.title.toLowerCase().indexOf(kw) >= 0; },
  detailUrl: function (d) {
    return '/pages/deal-detail/deal-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '');
  }
}));
