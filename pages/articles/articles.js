const safeArea = require('../../services/safe-area.js');
const create = require('../../services/list.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page(create({
  apiFn: api.getArticles,
  fallback: fb.latest,
  filter: function (it, kw) {
    return (it.title + ' ' + (it.labels || []).join(' ') + ' ' + it.author).toLowerCase().indexOf(kw) >= 0;
  },
  detailUrl: function (d) {
    return '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '');
  }
}));
