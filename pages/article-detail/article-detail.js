const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

// The website shows "Awards" in the crumb for award write-ups and "Articles" for
// everything else; it decides this from the article's section.
function crumbFor(item) {
  const isAward = !!item && item.section === 'Awards';
  return {
    crumbLabel: isAward ? 'Awards' : 'Articles',
    crumbUrl: isAward ? '/pages/awards/awards' : '/pages/articles/articles',
    relatedHeading: isAward ? 'Related awards' : 'Related articles'
  };
}

Page({
  behaviors: [safeArea, breadcrumb],
  data: { item: null, related: [], crumbLabel: 'Articles', crumbUrl: '/pages/articles/articles', relatedHeading: 'Related articles' },
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
      self.setData(Object.assign({ item: item || null }, crumbFor(item)));
    };
    if (id) {
      api.getArticleDetail(id).then(function (item) {
        self.setData(Object.assign({ item: item || null }, crumbFor(item)));
        const relatedRequest = item && item.section === 'Awards' ? api.getRelatedAwards(id) : api.getRelatedArticles(id);
        relatedRequest.then(function (r) { self.setData({ related: (r || []).slice(0, 5) }); }).catch(function () {});
      }).catch(fallback);
    } else {
      fallback();
    }
  },
  goArticle(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  },
  // The award cards link to the winner's profile, exactly like the website's
  // "View profile" button, but inside the mini program.
  goWinner(e) {
    const d = e.currentTarget.dataset;
    if (!d.id) return;
    const path = d.kind === 'lawfirms' ? '/pages/lawfirm-detail/lawfirm-detail' : '/pages/lawyer-detail/lawyer-detail';
    wx.navigateTo({ url: path + '?id=' + encodeURIComponent(d.id) + '&name=' + encodeURIComponent(d.name || '') });
  },
  // The website clamps each biography and expands it with these buttons.
  toggleBio(e) {
    const index = Number(e.currentTarget.dataset.index);
    const blocks = (this.data.item && this.data.item.award && this.data.item.award.blocks) || [];
    const block = blocks[index];
    if (!block || block.type !== 'winner') return;
    const patch = {};
    patch['item.award.blocks[' + index + '].winner.open'] = !block.winner.open;
    this.setData(patch);
  },
  copyDoi() {
    const url = this.data.item && this.data.item.doiUrl;
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success: function () { wx.showToast({ title: 'DOI link copied', icon: 'none' }); }
    });
  }
});
