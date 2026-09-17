const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page({
  behaviors: [safeArea, breadcrumb],
  data: { item: null, related: [] },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const title = decodeURIComponent(options.title || '');
    const self = this;
    const fallback = function () {
      let item = fb.deals.find(function (x) {
        return (id && x.id === id) || (title && x.title === title);
      });
      if (item) {
        item.body = 'This deal/case has been independently reviewed and recognised by LegalOne Merits. The full record is published on the LegalOne Global website.';
      }
      self.setData({ item: item || null });
    };
    if (id) {
      api.getDealDetail(id).then(function (item) {
        self.setData({ item: item || null });
        api.getDealTopDeals(id).then(function (r) { self.setData({ related: (r || []).slice(0, 5) }); }).catch(function () {});
      }).catch(fallback);
    } else {
      fallback();
    }
  },
  goDeal(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/deal-detail/deal-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  }
});
