const safeArea = require('../../services/safe-area.js');
const create = require('../../services/list.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');
const announcementTarget = require('../../services/announcement-target.js');

Page(create({
  apiFn: api.getAnnouncements,
  fallback: fb.announcements,
  // The announcements endpoint answers with the whole set at once and ignores
  // paging (checked against the live API: /api/crm/announcements/tops returns
  // the same 100 rows for every Max/Start), so without client paging the page
  // would drop all 100 entries in at once and never reach its "Learn more"
  // button. Page the full set on the client, as the website does (12 per page).
  // The search box that used to sit under the heading was removed on the
  // client's request (12 Oct review, item 1).
  clientPaging: true,
  manualPaging: true,
  detailUrl: function (d) {
    return announcementTarget.detailUrl(d) ||
      '/pages/announcement-detail/announcement-detail?id=' + encodeURIComponent(d.id || '');
  }
}));
