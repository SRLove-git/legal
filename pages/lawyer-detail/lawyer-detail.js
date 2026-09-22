const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');
const h5 = require('../../services/h5.js');

function completeDetail(item) {
  return Object.assign({
    positions: [],
    contacts: [],
    awards: [],
    careerPaths: [],
    legalOneAwards: [],
    practiceAreas: [],
    admissions: [],
    languages: [],
    educations: [],
    memberships: [],
    biography: '',
    biographyHtml: ''
  }, item || {});
}

Page({
  behaviors: [safeArea, breadcrumb],
  data: {
    item: null,
    cases: [],
    articles: [],
    testimonials: [],
    topAds: [],
    downAds: [],
    loading: true,
    saved: false,
    savedItemId: '',
    saving: false
  },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const name = decodeURIComponent(options.name || '');
    const self = this;
    const fallback = function () {
      const item = fb.lawyers.find(function (x) {
        return (id && x.id === id) || (name && x.name === name);
      });
      self.setData({ item: item ? completeDetail(item) : null, loading: false });
      if (item && item.id) self.loadSavedStatus(item.id);
    };
    if (id) {
      api.getLawyerDetail(id).then(function (item) {
        self.setData({ item: item ? completeDetail(item) : null, loading: false });
        self.loadSub(id);
        self.loadAdvertisements();
        self.loadSavedStatus(id);
      }).catch(fallback);
    } else {
      fallback();
    }
  },
  // Annex A §4.3 — profile embed shorts (cases / articles)
  onShow() {
    if (this.data.item && this.data.item.id) this.loadSavedStatus(this.data.item.id);
  },
  loadSub(id) {
    const self = this;
    api.getLawyerCases(id, { max: 5 }).then(function (r) { self.setData({ cases: (r || []).slice(0, 5) }); }).catch(function () {});
    api.getLawyerArticles(id, { max: 5 }).then(function (r) { self.setData({ articles: (r || []).slice(0, 5) }); }).catch(function () {});
    api.getLawyerTestimonials(id, { max: 5 }).then(function (r) { self.setData({ testimonials: (r || []).slice(0, 5) }); }).catch(function () {});
  },
  loadAdvertisements() {
    const self = this;
    api.getLawyerAdvertisements().then(function (ads) {
      self.setData({ topAds: ads.top || [], downAds: ads.down || [] });
    }).catch(function () {});
  },
  loadSavedStatus(id) {
    const token = wx.getStorageSync('X-ACCESS-TOKEN');
    const memberId = wx.getStorageSync('memberId');
    if (!token || !memberId || !id) {
      this.setData({ saved: false, savedItemId: '' });
      return;
    }
    const self = this;
    api.getSavedStatus(memberId, 'lawyer', id).then(function (result) {
      self.setData({
        saved: !!(result && result.saved),
        savedItemId: (result && result.savedItemId) || ''
      });
    }).catch(function () {
      self.setData({ saved: false, savedItemId: '' });
    });
  },
  onSave() {
    if (this.data.saving) return;
    const token = wx.getStorageSync('X-ACCESS-TOKEN');
    const memberId = wx.getStorageSync('memberId');
    if (!token || !memberId) {
      wx.showModal({
        title: 'Login required',
        content: 'Login to save this page',
        confirmText: 'Login',
        success: function (result) {
          if (result.confirm) wx.navigateTo({ url: '/pages/login/login' });
        }
      });
      return;
    }
    const item = this.data.item || {};
    if (!item.id) return;
    if (this.data.saved && !this.data.savedItemId) {
      this.loadSavedStatus(item.id);
      return;
    }
    const self = this;
    this.setData({ saving: true });
    const operation = this.data.saved
      ? api.unsaveItem(memberId, this.data.savedItemId)
      : api.saveItem(memberId, 'lawyer', item.id, '/profile/lawyers/' + item.id);
    operation.then(function (result) {
      const saved = !self.data.saved;
      self.setData({
        saved: saved,
        savedItemId: saved ? ((result && (result.id || result.savedItemId)) || self.data.savedItemId) : '',
        saving: false
      });
    }).catch(function () {
      self.setData({ saving: false });
      wx.showToast({ title: 'Unable to update saved items', icon: 'none' });
    });
  },
  goDeal(e) {
    const d = e.currentTarget.dataset;
    if (!d.id) return;
    wx.navigateTo({ url: '/pages/deal-detail/deal-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  },
  goArticle(e) {
    const d = e.currentTarget.dataset;
    if (!d.id) return;
    wx.navigateTo({ url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  },
  goFirm(e) {
    const d = e.currentTarget.dataset;
    if (!d.id) return;
    wx.navigateTo({ url: '/pages/lawfirm-detail/lawfirm-detail?id=' + encodeURIComponent(d.id) + '&name=' + encodeURIComponent(d.name || '') });
  },
  openVerification() {
    const verificationId = this.data.item && this.data.item.verificationId;
    if (!verificationId) {
      wx.showToast({ title: 'Verification details unavailable', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/verification-detail/verification-detail?id=' + encodeURIComponent(verificationId)
    });
  },
  openAdvertisement(e) {
    const link = e.currentTarget.dataset.link;
    if (link) h5.open(link, 'Advertisement');
  },
  onShareAppMessage() {
    const item = this.data.item || {};
    return {
      title: item.name || 'LegalOne lawyer profile',
      path: '/pages/lawyer-detail/lawyer-detail?id=' + encodeURIComponent(item.id || '') + '&name=' + encodeURIComponent(item.name || '')
    };
  }
});
