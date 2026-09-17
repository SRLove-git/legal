const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page({
  behaviors: [safeArea, breadcrumb],
  data: { item: null, cases: [], articles: [] },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const name = decodeURIComponent(options.name || '');
    const self = this;
    const fallback = function () {
      const item = fb.lawyers.find(function (x) {
        return (id && x.id === id) || (name && x.name === name);
      });
      self.setData({ item: item || null });
    };
    if (id) {
      api.getLawyerDetail(id).then(function (item) {
        self.setData({ item: item || null });
        self.loadSub(id);
      }).catch(fallback);
    } else {
      fallback();
    }
  },
  // Annex A §4.3 — profile embed shorts (cases / articles)
  loadSub(id) {
    const self = this;
    api.getLawyerCases(id, { max: 5 }).then(function (r) { self.setData({ cases: (r || []).slice(0, 5) }); }).catch(function () {});
    api.getLawyerArticles(id, { max: 5 }).then(function (r) { self.setData({ articles: (r || []).slice(0, 5) }); }).catch(function () {});
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
