const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const auth = require('../../services/auth.js');
const h5 = require('../../services/h5.js');
const documents = require('../../services/document.js');
const config = require('../../config.js');

Page({
  behaviors: [safeArea, breadcrumb],
  data: { groups: [], loading: true, error: '' },
  onLoad() {
    if (!auth.requireLogin()) return;
    const self = this;
    api.getApplicationForms().then(function (list) {
      const byJurisdiction = {};
      (list || []).forEach(function (f) {
        const key = f.jurisdiction || 'Other';
        if (!byJurisdiction[key]) byJurisdiction[key] = [];
        byJurisdiction[key].push(f);
      });
      const groups = Object.keys(byJurisdiction).map(function (k) {
        return { jurisdiction: k, forms: byJurisdiction[k] };
      });
      self.setData({ groups: groups, loading: false });
    }).catch(function (err) {
      self.setData({ loading: false, error: (err && (err.description || err.message)) || 'Could not load forms.' });
    });
  },
  // Schedule 2 §3.7 — PDF via downloadFile + openDocument. The form's pdfForm is a
  // CDN blob key, so the URL and the document type come from services/document.js.
  downloadPdf(e) {
    documents.open(e.currentTarget.dataset.path, 'Award application form');
  },
  // Schedule 2 §3.8 — Create via API, then open the existing mobile H5 E-form.
  openEform(e) {
    const f = e.currentTarget.dataset;
    const self = this;
    // The H5 form lives in a folder named after the formSubType, so the same value
    // has to be used for the submission and for its URL. Reading it off the dataset
    // (f.subtype, which does not exist) produced /award-submission//index.html.
    const subType = api.awardFormSubType(f);
    api.getMember(auth.getMemberId()).then(function (m) {
      self._member = m || {};
      return api.createSubmission({
        awardName: f.name || '',
        clientRemark: '',
        email: (m && (m.businessEmail || m.personalEmail)) || '',
        lawFirmName: (m && m.firmName) || '',
        formId: f.formid || '',
        formType: 'award-submission',
        formSubType: subType,
        memberId: auth.getMemberId()
      });
    }).then(function (res) {
      const id = res && res.id;
      if (!id) throw new Error('No submission id');
      h5.open(api.formUrl(config.h5Host, 'award-submission', subType, id), f.name || 'Award application');
    }).catch(function (err) {
      wx.showModal({
        title: 'Award application',
        content: (err && (err.description || err.message)) || 'Could not start the application.',
        showCancel: false
      });
    });
  }
});
