const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');
const h5 = require('../../services/h5.js');

const SITE = 'https://www.legaloneglobal.com';
const HYPHEN_ICON = SITE + '/images/hyphen.JPG';
// Small merits badges used next to each deal/case tier on the website.
const RANK_SMALL_ICONS = {
  1: SITE + '/images/LegalOne_Merits_Distinguished_Icon_Small.png',
  2: SITE + '/images/LegalOne_Merits_Exemplary_Icon_Small.png',
  3: SITE + '/images/LegalOne_Merits_Remarkable_Icon_Small.png'
};
// The website shows the first five rows of each profile embed plus a "More" button.
const EMBED_MAX = 5;
// Every "More" button on the website is a link to a firm-scoped list page
// (/deals_list_lawfirm/{id}/{name}, /lawfirm_lawyer_list/{id}/{name}, ...). The
// mini program shows the same lists in its own entity-list page so the header
// and rows stay in the app's current style.
const MORE_TYPES = {
  cases: 'lawfirm-cases',
  articles: 'lawfirm-articles',
  honours: 'lawfirm-honours',
  offices: 'lawfirm-offices',
  lawyers: 'lawfirm-lawyers',
  partners: 'lawfirm-partners'
};

function completeDetail(item) {
  return Object.assign({
    id: '',
    name: '',
    nameLocal: '',
    image: '',
    refNo: '',
    updated: '',
    established: '',
    website: '',
    location: '',
    numOfOffice: 0,
    numOfPartner: 0,
    numOfLawyer: 0,
    numOfDeal: 0,
    distinguished: 0,
    exemplary: 0,
    remarkable: 0,
    industries: [],
    industriesProvidedByClient: '',
    officesProvidedByClient: '',
    officesProvidedByClientHtml: '',
    awards: [],
    awardsHtml: '',
    video: '',
    videoPoster: '',
    videoCaption: '',
    carouselImages: [],
    offices: [],
    honours: [],
    overview: '',
    overviewHtml: ''
  }, item || {});
}

// Every deal/case row on the website carries its merits badge next to the tier
// name, so the numeric rank selects the matching small icon.
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
    loading: true,
    cases: [],
    articles: [],
    honours: [],
    lawyers: [],
    partners: [],
    offices: [],
    topAds: [],
    downAds: [],
    mediaItems: [],
    mediaImageUrls: [],
    moreCases: false,
    moreArticles: false,
    moreHonours: false,
    moreLawyers: false,
    morePartners: false,
    moreOffices: false,
    hyphenIcon: HYPHEN_ICON,
    saved: false,
    savedItemId: '',
    saving: false
  },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const name = decodeURIComponent(options.name || '');
    const self = this;
    const fallback = function () {
      const item = fb.lawfirms.find(function (x) {
        return (id && x.id === id) || (name && x.name === name);
      });
      self.applyDetail(item || null);
      if (item && item.id) self.loadSavedStatus(item.id);
    };
    if (id) {
      api.getLawfirmDetail(id).then(function (item) {
        self.applyDetail(item);
        if (item && item.id) {
          self.loadSub(item.id);
          self.loadSavedStatus(item.id);
        }
      }).catch(fallback);
    } else {
      fallback();
    }
    this.loadAdvertisements();
  },
  onShow() {
    if (this.data.item && this.data.item.id) this.loadSavedStatus(this.data.item.id);
  },
  applyDetail(item) {
    const detail = item ? completeDetail(item) : null;
    const data = { item: detail, loading: false, mediaItems: [], mediaImageUrls: [] };
    if (!detail) {
      this.setData(data);
      return;
    }
    if (!detail.overview && !detail.overviewHtml) {
      detail.overview = 'This law firm is listed in the LegalOne Global directory. Its full profile is available on the LegalOne Global website.';
    }
    if (detail.video) {
      data.mediaItems.push({
        type: 'video',
        url: detail.video,
        poster: detail.videoPoster || ''
      });
    }
    detail.carouselImages.forEach(function (url) {
      data.mediaItems.push({ type: 'image', url: url });
      data.mediaImageUrls.push(url);
    });
    // The website prints "More" once a section holds five rows or more.
    data.offices = detail.offices.slice(0, EMBED_MAX);
    data.moreOffices = detail.offices.length >= EMBED_MAX;
    // The honours endpoint is the website's source; the profile payload keeps a
    // copy so the section still renders when that request fails.
    data.honours = detail.honours.slice(0, EMBED_MAX);
    data.moreHonours = detail.honours.length >= EMBED_MAX;
    this.setData(data);
  },
  previewMediaImage(e) {
    const current = e.currentTarget.dataset.url;
    if (!current || !this.data.mediaImageUrls.length) return;
    wx.previewImage({ current: current, urls: this.data.mediaImageUrls });
  },
  // Annex A section 4.1 - profile sub-lists (cases / articles / honours / lawyers / partners)
  loadSub(id) {
    const self = this;
    api.getLawfirmCases(id, { max: EMBED_MAX }).then(function (r) {
      const rows = (r || []).slice(0, EMBED_MAX);
      self.setData({ cases: rows.map(decorateDeal), moreCases: (r || []).length >= EMBED_MAX });
    }).catch(function () {});
    api.getLawfirmArticles(id, { max: EMBED_MAX }).then(function (r) {
      const rows = (r || []).slice(0, EMBED_MAX);
      self.setData({ articles: rows.map(decorateArticle), moreArticles: (r || []).length >= EMBED_MAX });
    }).catch(function () {});
    api.getLawfirmHonours(id, { max: EMBED_MAX }).then(function (r) {
      const rows = (r || []).slice(0, EMBED_MAX);
      if (rows.length) self.setData({ honours: rows, moreHonours: (r || []).length >= EMBED_MAX });
    }).catch(function () {});
    api.getLawfirmLawyers(id, { max: EMBED_MAX }).then(function (r) {
      const rows = (r || []).slice(0, EMBED_MAX);
      self.setData({ lawyers: rows, moreLawyers: (r || []).length >= EMBED_MAX });
    }).catch(function () {});
    api.getLawfirmPartners(id, { max: EMBED_MAX }).then(function (r) {
      const rows = (r || []).slice(0, EMBED_MAX);
      self.setData({ partners: rows, morePartners: (r || []).length >= EMBED_MAX });
    }).catch(function () {});
  },
  loadAdvertisements() {
    const self = this;
    api.getLawfirmAdvertisements().then(function (ads) {
      self.setData({ topAds: (ads && ads.top) || [], downAds: (ads && ads.down) || [] });
    }).catch(function () {});
  },
  // "More" follows the website's links: each one opens that section's own list
  // page (firm-scoped), rendered by the mini program itself.
  showMore(e) {
    const kind = e.currentTarget.dataset.kind;
    const item = this.data.item || {};
    const type = MORE_TYPES[kind];
    if (!type || !item.id) return;
    wx.navigateTo({
      url: '/pages/entity-list/entity-list?type=' + encodeURIComponent(type) +
        '&id=' + encodeURIComponent(item.id) +
        '&name=' + encodeURIComponent(item.name || '')
    });
  },
  // The website lists each office's practice areas behind a toggle.
  toggleOffice(e) {
    const index = Number(e.currentTarget.dataset.index);
    const offices = (this.data.offices || []).map(function (office, i) {
      return Object.assign({}, office, { open: i === index ? !office.open : office.open });
    });
    this.setData({ offices: offices });
  },
  // Office rows link to that office's profile page, like the website.
  goOffice(e) {
    const d = e.currentTarget.dataset;
    const item = this.data.item || {};
    if (!d.id || !item.id) return;
    wx.navigateTo({
      url: '/pages/lawfirm-office/lawfirm-office?firmId=' + encodeURIComponent(item.id) +
        '&officeId=' + encodeURIComponent(d.id) +
        '&name=' + encodeURIComponent(d.name || d.city || '') +
        '&firmName=' + encodeURIComponent(item.name || '')
    });
  },
  loadSavedStatus(id) {
    const token = wx.getStorageSync('X-ACCESS-TOKEN');
    const memberId = wx.getStorageSync('memberId');
    if (!token || !memberId || !id) {
      this.setData({ saved: false, savedItemId: '' });
      return;
    }
    const self = this;
    api.getSavedStatus(memberId, 'lawfirm', id).then(function (result) {
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
      : api.saveItem(memberId, 'lawfirm', item.id, '/profile/lawfirms/' + item.id);
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
  goWebsite() {
    const website = (this.data.item || {}).website;
    if (!website) return;
    h5.open(/^https?:\/\//i.test(website) ? website : 'https://' + website, website);
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
      title: item.name || 'LegalOne law firm profile',
      path: '/pages/lawfirm-detail/lawfirm-detail?id=' + encodeURIComponent(item.id || '') + '&name=' + encodeURIComponent(item.name || '')
    };
  }
});
