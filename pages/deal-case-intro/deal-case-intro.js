const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const content = require('../../data/deal-case-intro.js');

Page({
  behaviors: [safeArea, breadcrumb],
  data: {
    breadcrumbSeparator: '>',
    heroTitleLine2: 'Deals & Cases',
    methodology: content.methodology.cards,
    merits: content.methodology.merits,
    doty: content.doty,
    faq: content.faq,
    faqContact: 'If you have any questions or require support whilst navigating your dashboard or completing your submission form, please do not hesitate to contact us at editorial@legaloneglobal.com.',
    openFaq: {},
    openFaqGroups: {}
  },

  onLoad(options) {
    const section = options && options.section;
    this._targetSection = ['methodology', 'doty', 'faq'].indexOf(section) >= 0 ? section : '';
  },

  onReady() {
    if (!this._targetSection) return;
    const section = this._targetSection;
    this._targetSection = '';
    const query = wx.createSelectorQuery();
    query.select('#' + section).boundingClientRect();
    query.selectViewport().scrollOffset();
    query.exec((res) => {
      const rect = res && res[0];
      const viewport = res && res[1];
      if (!rect) return;
      const headerHeight = (this.data.statusBarHeight || 20) + 44;
      wx.pageScrollTo({
        scrollTop: Math.max(0, ((viewport && viewport.scrollTop) || 0) + rect.top - headerHeight),
        duration: 0
      });
    });
  },

  toggleFaq(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const openFaq = Object.assign({}, this.data.openFaq);
    const openFaqGroups = Object.assign({}, this.data.openFaqGroups);
    openFaq[id] = !openFaq[id];
    this.data.faq.forEach((group, index) => {
      if (group.items.some((item) => item.id === id)) {
        openFaqGroups[index] = group.items.every((item) => openFaq[item.id]);
      }
    });
    this.setData({ openFaq, openFaqGroups });
  },

  toggleFaqGroup(e) {
    const index = Number(e.currentTarget.dataset.index);
    const group = this.data.faq[index];
    if (!group) return;
    const openFaq = Object.assign({}, this.data.openFaq);
    const openFaqGroups = Object.assign({}, this.data.openFaqGroups);
    const shouldOpen = !group.items.every((item) => openFaq[item.id]);
    group.items.forEach((item) => { openFaq[item.id] = shouldOpen; });
    openFaqGroups[index] = shouldOpen;
    this.setData({ openFaq, openFaqGroups });
  },

  goArticle(e) {
    const webUrl = e.currentTarget.dataset.url || '';
    const match = webUrl.match(/\/articles\/([^/?#]+)/);
    if (!match) return;
    wx.navigateTo({ url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(match[1]) });
  },

  startSubmission() {
    wx.navigateTo({ url: '/pages/dashboard/dashboard' });
  }
});
