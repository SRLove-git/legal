const create = require('../../services/list.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page(create({
  apiFn: api.getAnnouncements,
  fallback: fb.announcements,
  filter: function (it, kw) {
    return (it.headline + ' ' + it.type + ' ' + it.descript + ' ' + it.date).toLowerCase().indexOf(kw) >= 0;
  },
  detailUrl: function (d) {
    return '/pages/announcement-detail/announcement-detail?id=' + encodeURIComponent(d.id || '');
  }
}));
