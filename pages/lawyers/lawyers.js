const create = require('../../services/list.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page(create({
  apiFn: api.getLawyers,
  fallback: fb.lawyers,
  filter: function (it, kw) {
    return (it.name + ' ' + it.firm + ' ' + it.location + ' ' + (it.positions || []).join(' ')).toLowerCase().indexOf(kw) >= 0;
  },
  detailUrl: function (d) {
    return '/pages/lawyer-detail/lawyer-detail?id=' + encodeURIComponent(d.id || '') + '&name=' + encodeURIComponent(d.name || '');
  }
}));
