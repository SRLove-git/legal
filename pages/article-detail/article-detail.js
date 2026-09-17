const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page({
  behaviors: [safeArea],
  data: { item: null, related: [] },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const title = decodeURIComponent(options.title || '');
    const self = this;
    const fallback = function () {
      const pool = fb.latest.concat(fb.highlights, fb.awards);
      let item = pool.find(function (x) {
        return (id && x.id === id) || (title && x.title === title);
      });
      if (item) {
        item.body = 'This article is published by the LegalOne Editorial Team. The full piece is available on the LegalOne Global website.';
      }
      self.setData({ item: item || null });
    };
    if (id) {
      api.getArticleDetail(id).then(function (item) {
        self.setData({ item: item || null });
        api.getRelatedArticles(id).then(function (r) { self.setData({ related: (r || []).slice(0, 5) }); }).catch(function () {});
      }).catch(fallback);
    } else {
      fallback();
    }
  },
  goArticle(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  }
});
