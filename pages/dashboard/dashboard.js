const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');
const auth = require('../../services/auth.js');
const h5 = require('../../services/h5.js');
const config = require('../../config.js');

Page({
  behaviors: [safeArea],
  data: {
    member: null,
    greeting: '',
    subline: '',
    loading: true,
    incomplete: false,
    emptyVerifications: true,
    emptyDeals: true,
    emptyAwards: true,
    verifications: [],
    dealSubs: [],
    awardSubs: []
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
      const parts = [member.position, member.firmName].filter(Boolean);
      self.setData({
        member: member,
        greeting: [member.salutation, member.firstName, member.lastName].filter(Boolean).join(' '),
        subline: parts.join(' - '),
        loading: false,
        incomplete: !auth.isProfileComplete(member)
      });
      self.loadActivity(memberId);
    }).catch(function () {
      self.setData({ loading: false });
    });
  },
  // Schedule 2 §3.6.3 — at most 3 rows each, status labels from Annex B §8.
  loadActivity(memberId) {
    const self = this;
    api.getVerifications(memberId).then(function (list) {
      const rows = (list || []).slice(0, 3).map(function (v) {
        return {
          orderId: v.orderId,
          title: api.showVerificationNumber(v.status, v.id) || v.orderId || 'Verification',
          meta: [api.verificationStatus(v.status, v.paymentStatus), v.submittedDate].filter(Boolean).join(' - ')
        };
      });
      self.setData({ verifications: rows, emptyVerifications: rows.length === 0 });
    }).catch(function () {});
    api.getDealSubmissions(memberId).then(function (list) {
      const rows = (list || []).slice(0, 3).map(function (s) {
        return { id: s.id, title: s.dealName || 'Deal submission', meta: [api.submissionStatus(s.status), s.creationDate].filter(Boolean).join(' - ') };
      });
      self.setData({ dealSubs: rows, emptyDeals: rows.length === 0 });
    }).catch(function () {});
    api.getAwardSubmissions(memberId).then(function (list) {
      const rows = (list || []).slice(0, 3).map(function (s) {
        return { id: s.id, title: s.awardName || 'Award submission', meta: [api.submissionStatus(s.status), s.creationDate].filter(Boolean).join(' - ') };
      });
      self.setData({ awardSubs: rows, emptyAwards: rows.length === 0 });
    }).catch(function () {});
  },
  goSettings() {
    wx.navigateTo({ url: '/pages/account/account' });
  },
  goCompleteProfile() {
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit?mode=complete' });
  },
  // Verification is display-only in the mini program — open the website URL.
  openVerification() {
    h5.open('/member_verification', 'LegalOne Verification');
  },
  // Schedule 2 §3.6.2 — create via API then open the existing mobile H5 form.
  startDealSubmission() {
    if (this.data.incomplete) return this.goCompleteProfile();
    const self = this;
    const m = this.data.member || {};
    const isLawyerFirm = (m.sector || '').toLowerCase().indexOf('law firm (lawyer)') === 0;
    const body = {
      dealName: '',
      email: m.businessEmail || m.personalEmail || '',
      lawFirmName: m.firmName || '',
      formId: 'deal-submission',
      formType: 'deal-submission',
      formSubType: '',
      memberId: auth.getMemberId()
    };
    if (isLawyerFirm) body.isNominatingPartner = true;
    api.createSubmission(body).then(function (res) {
      const id = res && res.id;
      if (!id) throw new Error('No submission id');
      h5.open(api.formUrl(config.h5Host, 'deal-submission', '', id), 'Deal/case submission');
    }).catch(function (err) {
      wx.showModal({
        title: 'Deal/case submission',
        content: (err && (err.description || err.message)) || 'Could not start the submission.',
        showCancel: false
      });
    });
  },
  goFormDownload() {
    wx.navigateTo({ url: '/pages/form-download/form-download' });
  },
  openDeal(e) {
    const id = e.currentTarget.dataset.id;
    h5.open(api.formUrl(config.h5Host, 'deal-submission', '', id), 'Deal/case submission');
  },
  openAward(e) {
    const d = e.currentTarget.dataset;
    h5.open(api.formUrl(config.h5Host, 'award-submission', d.sub || '', d.id), 'Award submission');
  },
  goLogin() {
    wx.redirectTo({ url: '/pages/login/login' });
  }
});
