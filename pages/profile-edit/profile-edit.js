const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const auth = require('../../services/auth.js');
const sector = require('../../services/sector.js');

const SALUTATIONS = ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'];

function blankForm() {
  return {
    salutation: 'Mr',
    firstName: '',
    lastName: '',
    nameLocal: '',
    sector: sector.list()[0].value,
    firmId: '',
    firmName: '',
    firmNameLocal: '',
    position: '',
    otherPosition: '',
    isPartner: false,
    country: '',
    otherCountry: '',
    city: '',
    otherCity: '',
    address: '',
    localAddress: '',
    mobileCode: '',
    mobile: '',
    phoneCode: '',
    phone: ''
  };
}

Page({
  behaviors: [safeArea, breadcrumb],
  data: {
    mode: 'edit',
    form: blankForm(),
    salutations: SALUTATIONS,
    salutationIndex: 0,
    sectors: sector.list(),
    sectorIndex: 0,
    orgLabel: sector.list()[0].orgLabel,
    showPositionList: true,
    showPartner: true,
    autocomplete: true,
    countries: [],
    positions: [],
    callingCodes: [],
    firmSuggestions: [],
    error: '',
    loading: true,
    saving: false
  },
  onLoad(options) {
    this.setData({ mode: options.mode === 'complete' ? 'complete' : 'edit' });
    if (!auth.requireLogin()) return;
    this.load();
  },
  load() {
    const self = this;
    const memberId = auth.getMemberId();
    api.getMember(memberId).then(function (m) {
      const form = blankForm();
      Object.keys(form).forEach(function (k) {
        if (m && m[k] !== undefined && m[k] !== null && m[k] !== '') form[k] = m[k];
      });
      self.setData({ form: form, loading: false });
      self.syncSectorUi(form.sector);
      self.setData({
        salutationIndex: Math.max(0, SALUTATIONS.indexOf(m && m.salutation))
      });
    }).catch(function (err) {
      self.setData({ loading: false, error: (err && (err.description || err.message)) || 'Could not load your profile.' });
    });

    // Lookups are optional; the form still works when they fail.
    api.getCodeCountries().then(function (r) { self.setData({ countries: r }); }).catch(function () {});
    api.getCodePositions().then(function (r) { self.setData({ positions: r }); }).catch(function () {});
    api.getCodeCallingCodes().then(function (r) {
      self.setData({ callingCodes: (r || []).map(function (x) { return x.code || x.callingCode || x }).filter(Boolean) });
    }).catch(function () {});
  },
  syncSectorUi(value) {
    const s = sector.get(value);
    const list = sector.list();
    let idx = 0;
    for (let i = 0; i < list.length; i++) if (list[i].value === s.value) idx = i;
    this.setData({
      sectorIndex: idx,
      orgLabel: s.orgLabel,
      showPositionList: s.positionList === 'dropdown',
      showPartner: s.showPartner,
      autocomplete: s.autocomplete
    });
  },
  onSalutation(e) {
    const i = Number(e.detail.value);
    this.setData({ salutationIndex: i, 'form.salutation': SALUTATIONS[i] });
  },
  // Schedule 2 §3.5.3 — sector change clears org / position / location fields.
  onSector(e) {
    const i = Number(e.detail.value);
    const value = this.data.sectors[i].value;
    const form = Object.assign({}, this.data.form, { sector: value });
    sector.clearedOnSectorChange().forEach(function (k) { form[k] = k === 'isPartner' ? false : ''; });
    this.setData({ form: form });
    this.syncSectorUi(value);
  },
  onField(e) {
    const patch = {};
    patch['form.' + e.currentTarget.dataset.key] = e.detail.value;
    this.setData(patch);
  },
  onPartner(e) {
    this.setData({ 'form.isPartner': !!e.detail.value });
  },
  // Firm autocomplete (profile only — never used by the H5 E-form).
  onFirmInput(e) {
    const term = (e.detail.value || '').trim();
    this.setData({ 'form.firmName': e.detail.value, 'form.firmId': '' });
    if (!this.data.autocomplete || term.length < 2) {
      this.setData({ firmSuggestions: [] });
      return;
    }
    const self = this;
    clearTimeout(this._firmTimer);
    this._firmTimer = setTimeout(function () {
      api.searchLawfirms(term).then(function (r) {
        self.setData({ firmSuggestions: (r || []).slice(0, 6) });
      }).catch(function () {});
    }, 300);
  },
  pickFirm(e) {
    const it = e.currentTarget.dataset;
    this.setData({ 'form.firmId': it.id || '', 'form.firmName': it.name || '', firmSuggestions: [] });
  },
  onUnload() {
    if (this._firmTimer) clearTimeout(this._firmTimer);
  },
  submit() {
    const d = this.data;
    const f = d.form;
    if (!f.firstName) return this.setData({ error: 'Please enter your first name' });
    if (!f.lastName) return this.setData({ error: 'Please enter your last name' });
    if (!f.country) return this.setData({ error: 'Please select your country or region' });
    if (!f.city) return this.setData({ error: 'Please enter your city' });
    if (!f.mobileCode) return this.setData({ error: 'Please select your mobile calling code' });
    if (!f.mobile) return this.setData({ error: 'Please enter your mobile number' });
    if (sector.get(f.sector).positionList === 'dropdown' && !f.position) return this.setData({ error: 'Please select your position' });
    if (sector.get(f.sector).orgLabel && !f.firmName) return this.setData({ error: 'Please enter your ' + sector.get(f.sector).orgLabel.toLowerCase() });

    const body = Object.assign({}, f, { id: auth.getMemberId() });
    const self = this;
    this.setData({ saving: true, error: '' });
    api.updateMember(body).then(function () {
      self.setData({ saving: false });
      wx.showToast({ title: 'Profile updated', icon: 'none' });
      setTimeout(function () {
        if (self.data.mode === 'complete') {
          wx.redirectTo({ url: '/pages/account/account' });
        } else {
          wx.navigateBack({ delta: 1 });
        }
      }, 700);
    }).catch(function (err) {
      self.setData({ saving: false, error: (err && (err.description || err.message)) || 'Update failed. Please try again.' });
    });
  }
});
