const safeArea = require('../../services/safe-area.js');
const create = require('../../services/list.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');
const announcementTarget = require('../../services/announcement-target.js');

Page(create({
  apiFn: api.getAnnouncements,
  fallback: fb.announcements,
  manualPaging: true,
  filter: function (it, kw) {
    return (it.headline + ' ' + it.type + ' ' + it.descript + ' ' + it.date).toLowerCase().indexOf(kw) >= 0;
  },
  detailUrl: function (d) {
    return announcementTarget.detailUrl(d) ||
      '/pages/announcement-detail/announcement-detail?id=' + encodeURIComponent(d.id || '');
  }
}));
