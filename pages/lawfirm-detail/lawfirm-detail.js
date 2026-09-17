const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page({
  behaviors: [safeArea],
  data: { item: null, lawyers: [], cases: [], honours: [] },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const name = decodeURIComponent(options.name || '');
    const self = this;
    const fallback = function () {
      const item = fb.lawfirms.find(function (x) {
        return (id && x.id === id) || (name && x.name === name);
      });
      if (item) {
        item.overview = 'This law firm is listed in the LegalOne Global directory. Its full profile is available on the LegalOne Global website.';
      }
      self.setData({ item: item || null });
    };
    if (id) {
      api.getLawfirmDetail(id).then(function (item) {
        self.setData({ item: item || null });
        self.loadSub(id);
      }).catch(fallback);
    } else {
      fallback();
    }
  },
  // Annex A §4.1 — profile sub-lists (lawyers / cases / honours)
  loadSub(id) {
    const self = this;
    api.getLawfirmLawyers(id, { max: 5 }).then(function (r) { self.setData({ lawyers: (r || []).slice(0, 5) }); }).catch(function () {});
    api.getLawfirmCases(id, { max: 5 }).then(function (r) { self.setData({ cases: (r || []).slice(0, 5) }); }).catch(function () {});
    api.getLawfirmHonours(id, { max: 5 }).then(function (r) { self.setData({ honours: (r || []).slice(0, 5) }); }).catch(function () {});
  },
  goLawyer(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/lawyer-detail/lawyer-detail?id=' + encodeURIComponent(d.id || '') + '&name=' + encodeURIComponent(d.name || '') });
  },
  goDeal(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/deal-detail/deal-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  },
  goArticle(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  }
});
