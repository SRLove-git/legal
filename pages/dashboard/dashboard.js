const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');
const auth = require('../../services/auth.js');
const h5 = require('../../services/h5.js');
const documents = require('../../services/document.js');
const config = require('../../config.js');

// The website dashboard previews at most 3 rows per card, then adds "More >>".
const PREVIEW = 3;

// WXML text nodes do not decode HTML entities (the website's browser does), so
// CMS values must be decoded before they are rendered.
function text(value) {
  return api.decodeEntities(value);
}

// Website helper statusColor(status, paymentStatus) -> green / red / default.
function verificationColor(status, paymentStatus) {
  const st = status ? String(status).toUpperCase() : null;
  const ps = paymentStatus ? String(paymentStatus).toUpperCase() : null;
  if (st === 'VERIFIED') return 'green';
  if ((st === 'PENDING' && ps == null) || ps === 'FAILED' || ps === 'REJECTED' || ps === 'EXPIRED') return 'red';
  return '';
}

// Website "Upcoming schedule" award rules: keep application forms whose deadline
// sits inside the [today - 1 month, today + 1 month] window, then split them into
// Asia and China (China + Hong Kong) and sort by deadline.
const CHINA_JURISDICTIONS = ['china', 'hong kong'];
const AWARD_PREVIEW = 3;

function isUpcomingAward(form) {
  const deadline = new Date(form && form.applicationDeadline);
  if (isNaN(deadline.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDay = new Date(deadline);
  deadlineDay.setHours(0, 0, 0, 0);
  const deadlinePlusMonth = new Date(deadlineDay);
  deadlinePlusMonth.setMonth(deadlinePlusMonth.getMonth() + 1);
  const inAMonth = new Date(today);
  inAMonth.setMonth(inAMonth.getMonth() + 1);
  return deadlinePlusMonth >= today && deadlineDay <= inAMonth;
}

function isChinaForm(form) {
  const jurisdiction = ((form && form.jurisdiction) || '').toLowerCase();
  return CHINA_JURISDICTIONS.some(function (key) { return jurisdiction.indexOf(key) !== -1; });
}

function awardRow(form, region) {
  return {
    key: region + '-' + (form.id || form.name || ''),
    id: form.id || '',
    name: text(form.name),
    type: form.type || '',
    jurisdiction: text(form.jurisdiction),
    deadline: api.dayMonthYear(form.applicationDeadline),
    status: api.awardStatus(form.applicationDeadline),
    applyType: form.eFormAvailable ? 'eform' : (form.pdfForm ? 'pdf' : ''),
    pdfForm: form.pdfForm || ''
  };
}

Page({
  behaviors: [safeArea],
  data: {
    loading: true,
    greeting: 'Welcome',
    profileError: '',
    incomplete: false,
    profile: { show: false, name: '', position: '', firm: '' },
    savedItems: [],
    savedItemsTotal: 0,
    verifications: [],
    verificationsTotal: 0,
    awardSubs: [],
    awardSubsTotal: 0,
    hasUpcoming: false,
    upcomingSurveys: [],
    upcomingSurveysMore: false,
    awardPanels: [],
    awardCounts: { asia: 0, china: 0 },
    awardRegion: 'all'
  },

  onShow() {
    if (!auth.requireLogin()) return;
    this.load();
  },

  load() {
    const self = this;
    const memberId = auth.getMemberId();
    api.getMember(memberId).then(function (m) {
      const member = m || {};
      const salutation = text(member.salutation);
      const personName = [text(member.firstName), text(member.lastName)].filter(Boolean).join(' ');
      const memberName = [salutation, personName].filter(Boolean).join(' ');
      // The website writes the dashboard title as "Welcome, Ms. Kiris Mak"
      // (salutation + full stop, then first and last name).
      const greetingName = [salutation ? salutation.replace(/\.+$/, '') + '.' : '', personName]
        .filter(Boolean)
        .join(' ');
      self.setData({
        loading: false,
        profileError: '',
        greeting: greetingName ? 'Welcome, ' + greetingName : 'Welcome',
        incomplete: !auth.isProfileComplete(member),
        profile: {
          show: !!memberName,
          name: memberName,
          position: text(member.position),
          firm: text(member.firmName)
        }
      });
      self.loadSavedItems(memberId);
      self.loadActivity(memberId);
      self.loadUpcoming(memberId);
    }).catch(function (err) {
      const description = (err && (err.description || err.message)) || '';
      // The member endpoint answers 401/403 once the stored session expires;
      // ask the reader to log in again instead of showing an empty dashboard.
      if (err && (err.statusCode === 401 || err.statusCode === 403 || err.code === -401)) {
        auth.clearSession();
        self.setData({
          loading: false,
          greeting: 'Welcome',
          profileError: 'Your session has expired. Please log in again.'
        });
        wx.showToast({ title: 'Please log in again', icon: 'none' });
        setTimeout(function () { wx.redirectTo({ url: '/pages/login/login' }); }, 900);
        return;
      }
      // Any other failure still keeps the heading, and says why it is empty.
      self.setData({
        loading: false,
        greeting: 'Welcome',
        profileError: description || 'Could not load your member details.'
      });
    });
  },

  // Website "Saved items" card: GET .../saved-items?limit=3&sortBy=savedDate&sortDir=desc
  loadSavedItems(memberId) {
    const self = this;
    api.getSavedItems(memberId, { limit: PREVIEW, sortBy: 'savedDate', sortDir: 'desc' }).then(function (res) {
      const items = (res && res.items) || [];
      self.setData({
        savedItems: items.map(function (item) {
          return {
            id: item.id,
            headline: text(item.headline || item.title),
            url: item.url || '',
            savedDate: api.dayMonthYear(item.savedDate),
            typeLabel: api.savedItemTypeLabel(item.contentType)
          };
        }),
        savedItemsTotal: (res && res.total) || items.length
      });
    }).catch(function () {});
  },

  // Website cards "My verification(s)" and "My award submission(s)".
  loadActivity(memberId) {
    const self = this;
    api.getVerifications(memberId).then(function (list) {
      const all = list || [];
      self.setData({
        verifications: all.slice(0, PREVIEW).map(function (v) {
          return {
            key: v.id || v.orderId || '',
            orderId: text(v.orderId),
            number: api.showVerificationNumber(v.status, v.id),
            status: api.verificationStatus(v.status, v.paymentStatus),
            color: verificationColor(v.status, v.paymentStatus),
            submittedDate: api.dayMonthYear(v.submittedDate),
            expiry: api.dayMonthYear(v.expiry)
          };
        }),
        verificationsTotal: all.length
      });
    }).catch(function () {});

    api.getAwardSubmissions(memberId).then(function (list) {
      const all = list || [];
      self.setData({
        awardSubs: all.slice(0, PREVIEW).map(function (s) {
          return {
            id: s.id,
            subType: s.formSubType || '',
            name: text(s.awardName),
            remark: text(s.clientRemark),
            submittedDate: api.dayMonthYear(s.creationDate),
            status: api.submissionStatus(s.status)
          };
        }),
        awardSubsTotal: all.length
      });
    }).catch(function () {});
  },

  // Website "Upcoming schedule" card — surveys plus award forms with a deadline
  // in the upcoming window.
  loadUpcoming(memberId) {
    const self = this;
    api.getSurveys(memberId).then(function (res) {
      const all = (res && res.upcoming) || [];
      self.setData({
        upcomingSurveys: all.slice(0, PREVIEW).map(function (s) {
          return {
            key: s.id || s.title || '',
            id: s.id || '',
            title: text(s.title),
            availableUntil: api.dayMonthYear(s.endDate),
            draftSaved: !!s.responseStatus
          };
        }),
        upcomingSurveysMore: all.length > PREVIEW
      });
      self.updateUpcomingFlag();
    }).catch(function () {});

    api.getApplicationForms().then(function (forms) {
      const upcoming = (forms || []).filter(isUpcomingAward);
      const byDeadline = function (a, b) {
        return new Date(a.applicationDeadline) - new Date(b.applicationDeadline);
      };
      const asia = upcoming.filter(function (f) { return !isChinaForm(f); }).sort(byDeadline);
      const china = upcoming.filter(isChinaForm).sort(byDeadline);
      const panels = [];
      if (asia.length) {
        panels.push({ region: 'asia', rows: asia.slice(0, AWARD_PREVIEW).map(function (f) { return awardRow(f, 'asia'); }) });
      }
      if (china.length) {
        panels.push({ region: 'china', rows: china.slice(0, AWARD_PREVIEW).map(function (f) { return awardRow(f, 'china'); }) });
      }
      self.setData({
        awardPanels: panels,
        awardCounts: { asia: asia.length, china: china.length }
      });
      self.updateUpcomingFlag();
    }).catch(function () {});
  },

  updateUpcomingFlag() {
    const has = this.data.upcomingSurveys.length > 0 || this.data.awardPanels.length > 0;
    if (has !== this.data.hasUpcoming) this.setData({ hasUpcoming: has });
  },

  onAwardRegion(e) {
    const region = e.currentTarget.dataset.region;
    if (region) this.setData({ awardRegion: region });
  },

  openSurvey(e) {
    const id = e.currentTarget.dataset.id;
    if (id) h5.open('/member_survey/' + encodeURIComponent(id), 'Survey');
  },
  openSurveyMore() {
    h5.open('/member_survey', 'Survey');
  },
  openAwardForms() {
    wx.navigateTo({ url: '/pages/form-download/form-download' });
  },
  downloadAwardPdf(e) {
    // The form's pdfForm is a CDN blob key, so the download and the explicit
    // document type both live in services/document.js.
    documents.open(e.currentTarget.dataset.path, 'Award application form');
  },
  // Same flow as pages/form-download: create the submission, then open the H5 E-form.
  applyAward(e) {
    const d = e.currentTarget.dataset;
    const subType = [d.type, (d.jurisdiction || '').toLowerCase().replace(/ /g, '-')].filter(Boolean).join('-');
    api.getMember(auth.getMemberId()).then(function (m) {
      return api.createSubmission({
        awardName: d.name || '',
        clientRemark: '',
        email: (m && (m.businessEmail || m.personalEmail)) || '',
        lawFirmName: (m && m.firmName) || '',
        formId: d.formid || '',
        formType: 'award-submission',
        formSubType: subType,
        memberId: auth.getMemberId()
      });
    }).then(function (res) {
      const id = res && res.id;
      if (!id) throw new Error('No submission id');
      h5.open(api.formUrl(config.h5Host, 'award-submission', subType, id), d.name || 'Award application');
    }).catch(function (err) {
      wx.showModal({
        title: 'Award application',
        content: (err && (err.description || err.message)) || 'Could not start the application.',
        showCancel: false
      });
    });
  },

  openSaved(e) {
    const url = e.currentTarget.dataset.url;
    if (url) h5.open(url, 'Saved item');
  },
  unsaveSaved(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const memberId = auth.getMemberId();
    const self = this;
    api.unsaveItem(memberId, id).then(function () {
      self.loadSavedItems(memberId);
    }).catch(function () {
      wx.showToast({ title: 'Unable to update saved items', icon: 'none' });
    });
  },
  openSavedMore() {
    h5.open('/member_saved_items', 'Saved items');
  },
  openVerification() {
    h5.open('/member_verification', 'LegalOne Verification');
  },
  openVerificationsMore() {
    h5.open('/member_verification_history', 'Verification history');
  },
  openAward(e) {
    const d = e.currentTarget.dataset;
    h5.open(api.formUrl(config.h5Host, 'award-submission', d.sub || '', d.id), 'Award submission');
  },
  openAwardsMore() {
    h5.open('/member_award_submission_history', 'Award submission history');
  },
  goSettings() {
    wx.navigateTo({ url: '/pages/account/account' });
  },
  goCompleteProfile() {
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit?mode=complete' });
  },
  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  }
});
