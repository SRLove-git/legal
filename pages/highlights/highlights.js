const create = require('../../services/list.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page(create({
  apiFn: function (opts) {
    opts = opts || {};
    opts.highlighted = true;
    return api.getArticles(opts);
  },
  fallback: fb.highlights,
  filter: function (it, kw) {
    return (it.title + ' ' + (it.labels || []).join(' ') + ' ' + it.author).toLowerCase().indexOf(kw) >= 0;
  },
  detailUrl: function (d) {
    return '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '');
  }
}));
