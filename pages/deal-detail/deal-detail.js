const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page({
  behaviors: [safeArea, breadcrumb],
  data: { item: null, related: [], insights: [] },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const title = decodeURIComponent(options.title || '');
    const self = this;
    const fallback = function () {
      let item = fb.deals.find(function (x) {
        return (id && x.id === id) || (title && x.title === title);
      });
      if (item) {
        item.body = 'This deal/case has been independently reviewed and recognised by LegalOne. The full record is published on the LegalOne Global website.';
        // The offline fallback only carries the card fields, so give the
        // website's detail blocks empty lists to render against.
        item.jurisdictions = item.jurisdictions || [];
        item.firms = item.firms || [];
        item.execs = item.execs || [];
        item.others = item.others || [];
        item.briefs = item.briefs || [];
      }
      self.setData({ item: item || null });
    };
    if (id) {
      api.getDealDetail(id).then(function (item) {
        self.setData({ item: item || null });
        // The website closes the page with "Expert insights" (the deal's related
        // articles) and "Related deals/cases", both from the tops endpoints.
        api.getDealTopArticles(id).then(function (r) {
          self.setData({
            insights: (r || []).slice(0, 5).map(function (a) {
              return { id: a.id, title: a.title, date: a.publishedDate, author: a.author };
            })
          });
        }).catch(function () {});
        api.getDealTopDeals(id).then(function (r) { self.setData({ related: (r || []).slice(0, 5) }); }).catch(function () {});
      }).catch(fallback);
    } else {
      fallback();
    }
  },
  goDeal(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/deal-detail/deal-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  },
  goArticle(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  },
  goLawfirm(e) {
    const d = e.currentTarget.dataset;
    if (!d.id) return;
    wx.navigateTo({ url: '/pages/lawfirm-detail/lawfirm-detail?id=' + encodeURIComponent(d.id) + '&name=' + encodeURIComponent(d.name || '') });
  },
  goLawyer(e) {
    const d = e.currentTarget.dataset;
    if (!d.id) return;
    wx.navigateTo({ url: '/pages/lawyer-detail/lawyer-detail?id=' + encodeURIComponent(d.id) + '&name=' + encodeURIComponent(d.name || '') });
  }
});
