const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const h5 = require('../../services/h5.js');

const SITE = 'https://www.legaloneglobal.com';
const HYPHEN_ICON = SITE + '/images/hyphen.JPG';
const RANK_SMALL_ICONS = {
  1: SITE + '/images/LegalOne_Merits_Distinguished_Icon_Small.png',
  2: SITE + '/images/LegalOne_Merits_Exemplary_Icon_Small.png',
  3: SITE + '/images/LegalOne_Merits_Remarkable_Icon_Small.png'
};
// The website shows the first five rows of each embed plus a "More" button.
const EMBED_MAX = 5;
const MORE_MAX = 48;

function completeDetail(item) {
  return Object.assign({
    id: '',
    name: '',
    refNo: '',
    city: '',
    country: '',
    location: '',
    updated: '',
    numOfDeal: 0,
    distinguished: 0,
    exemplary: 0,
    remarkable: 0,
    industries: []
  }, item || {});
}

function decorateDeal(deal) {
  return Object.assign({}, deal, { rankIcon: RANK_SMALL_ICONS[deal.rankNo] || '' });
}

function decorateArticle(article) {
  return Object.assign({}, article, { year: (article.publishedDate || article.date || '').split(', ').pop() });
}

Page({
  behaviors: [safeArea, breadcrumb],
  data: {
    item: null,
    firm: null,
    firmId: '',
    officeId: '',
    firmName: '',
    loading: true,
    cases: [],
    articles: [],
    lawyers: [],
    partners: [],
    topAds: [],
    downAds: [],
    moreCases: false,
    moreArticles: false,
    moreLawyers: false,
    morePartners: false,
    hyphenIcon: HYPHEN_ICON,
    saved: false,
    savedItemId: '',
    saving: false
  },
  onLoad(options) {
    const firmId = decodeURIComponent(options.firmId || '');
    const officeId = decodeURIComponent(options.officeId || '');
    const name = decodeURIComponent(options.name || '');
    const firmName = decodeURIComponent(options.firmName || '');
    this.setData({ firmId: firmId, officeId: officeId, firmName: firmName });
    if (!firmId || !officeId) {
      this.setData({ loading: false });
      return;
    }
    const self = this;
    // The firm payload carries every office entry, so the page still renders
    // when the office endpoint answers empty (it does that intermittently).
    api.getLawfirmDetail(firmId).catch(function () { return null; }).then(function (firm) {
      return api.getLawfirmOffice(firmId, officeId).catch(function () { return null; }).then(function (office) {
        let item = office;
        if (!item && firm) {
          const entry = (firm.offices || []).find(function (o) { return o.id === officeId; });
          if (entry) item = entry;
        }
        if (!item && name) item = { id: officeId, name: name };
        if (!item) {
          self.setData({ firm: firm || null, firmName: (firm && firm.name) || firmName, loading: false });
          return;
        }
        const detail = completeDetail(item);
        if (!detail.updated) detail.updated = (firm && firm.updated) || '';
        if (!detail.location) detail.location = [detail.city, detail.country].filter(Boolean).join(', ');
        self.setData({
          item: detail,
          firm: firm || null,
          firmName: (firm && firm.name) || firmName,
          loading: false
        });
        self.loadSub(firmId, officeId);
        self.loadSavedStatus(officeId);
      });
    }).catch(function () {
      self.setData({ loading: false });
    });
    this.loadAdvertisements();
  },
  loadSub(firmId, officeId) {
    const self = this;
    api.getOfficeCases(officeId, { max: EMBED_MAX }).then(function (r) {
      const rows = (r || []).slice(0, EMBED_MAX);
      self.setData({ cases: rows.map(decorateDeal), moreCases: (r || []).length >= EMBED_MAX });
    }).catch(function () {});
    api.getOfficeArticles(officeId, { max: EMBED_MAX }).then(function (r) {
      const rows = (r || []).slice(0, EMBED_MAX);
      self.setData({ articles: rows.map(decorateArticle), moreArticles: (r || []).length >= EMBED_MAX });
    }).catch(function () {});
    api.getOfficeLawyers(firmId, officeId, { max: EMBED_MAX }).then(function (r) {
      const rows = (r || []).slice(0, EMBED_MAX);
      self.setData({ lawyers: rows, moreLawyers: (r || []).length >= EMBED_MAX });
    }).catch(function () {});
    api.getOfficePartners(firmId, officeId, { max: EMBED_MAX }).then(function (r) {
      const rows = (r || []).slice(0, EMBED_MAX);
      self.setData({ partners: rows, morePartners: (r || []).length >= EMBED_MAX });
    }).catch(function () {});
  },
  loadAdvertisements() {
    const self = this;
    api.getOfficeAdvertisements().then(function (ads) {
      self.setData({ topAds: (ads && ads.top) || [], downAds: (ads && ads.down) || [] });
    }).catch(function () {});
  },
  showMore(e) {
    const kind = e.currentTarget.dataset.kind;
    const firmId = this.data.firmId;
    const officeId = this.data.officeId;
    const self = this;
    const done = function (rows, key, moreKey, decorate) {
      const patch = {};
      patch[key] = (rows || []).map(decorate || function (x) { return x; });
      patch[moreKey] = false;
      self.setData(patch);
    };
    if (kind === 'cases') {
      api.getOfficeCases(officeId, { max: MORE_MAX }).then(function (r) { done(r, 'cases', 'moreCases', decorateDeal); }).catch(function () {});
    } else if (kind === 'articles') {
      api.getOfficeArticles(officeId, { max: MORE_MAX }).then(function (r) { done(r, 'articles', 'moreArticles', decorateArticle); }).catch(function () {});
    } else if (kind === 'lawyers') {
      api.getOfficeLawyers(firmId, officeId, { max: MORE_MAX }).then(function (r) { done(r, 'lawyers', 'moreLawyers'); }).catch(function () {});
    } else if (kind === 'partners') {
      api.getOfficePartners(firmId, officeId, { max: MORE_MAX }).then(function (r) { done(r, 'partners', 'morePartners'); }).catch(function () {});
    }
  },
  loadSavedStatus(id) {
    const token = wx.getStorageSync('X-ACCESS-TOKEN');
    const memberId = wx.getStorageSync('memberId');
    if (!token || !memberId || !id) {
      this.setData({ saved: false, savedItemId: '' });
      return;
    }
    const self = this;
    api.getSavedStatus(memberId, 'lawfirmoffice', id).then(function (result) {
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
    const url = '/profile/lawfirm_office/' + this.data.firmId + '/' + item.id;
    const operation = this.data.saved
      ? api.unsaveItem(memberId, this.data.savedItemId)
      : api.saveItem(memberId, 'lawfirmoffice', item.id, url);
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
  goFirm() {
    const firmId = this.data.firmId;
    if (!firmId) return;
    wx.navigateTo({
      url: '/pages/lawfirm-detail/lawfirm-detail?id=' + encodeURIComponent(firmId) +
        '&name=' + encodeURIComponent(this.data.firmName || '')
    });
  },
  goLawyer(e) {
    const d = e.currentTarget.dataset;
    if (!d.id) return;
    wx.navigateTo({ url: '/pages/lawyer-detail/lawyer-detail?id=' + encodeURIComponent(d.id) + '&name=' + encodeURIComponent(d.name || '') });
  },
  goDeal(e) {
    const d = e.currentTarget.dataset;
    if (!d.id) return;
    wx.navigateTo({ url: '/pages/deal-detail/deal-detail?id=' + encodeURIComponent(d.id) + '&title=' + encodeURIComponent(d.title || '') });
  },
  goArticle(e) {
    const d = e.currentTarget.dataset;
    if (!d.id) return;
    wx.navigateTo({ url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id) + '&title=' + encodeURIComponent(d.title || '') });
  },
  openAdvertisement(e) {
    const link = e.currentTarget.dataset.link;
    if (link) h5.open(link, 'Advertisement');
  },
  onShareAppMessage() {
    const item = this.data.item || {};
    return {
      title: item.name || 'LegalOne office profile',
      path: '/pages/lawfirm-office/lawfirm-office?firmId=' + encodeURIComponent(this.data.firmId || '') +
        '&officeId=' + encodeURIComponent(item.id || '') +
        '&name=' + encodeURIComponent(item.name || '') +
        '&firmName=' + encodeURIComponent(this.data.firmName || '')
    };
  }
});
