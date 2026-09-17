const create = require('../../services/list.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page(create({
  apiFn: api.getLawfirms,
  fallback: fb.lawfirms,
  filter: function (it, kw) {
    return it.name.toLowerCase().indexOf(kw) >= 0;
  },
  detailUrl: function (d) {
    return '/pages/lawfirm-detail/lawfirm-detail?id=' + encodeURIComponent(d.id || '') + '&name=' + encodeURIComponent(d.name || '');
  }
}));
