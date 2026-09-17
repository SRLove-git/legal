const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');
const auth = require('../../services/auth.js');
const sector = require('../../services/sector.js');

const COOLDOWN_DAYS = 30;

Page({
  behaviors: [safeArea],
  data: {
    sectors: sector.list(),
    current: '',
    selected: '',
    blocked: false,
    nextAllowed: '',
    loading: true
  },
  onLoad() {
    if (!auth.requireLogin()) return;
    const self = this;
    api.getMember(auth.getMemberId()).then(function (m) {
      const current = (m && m.sector) || '';
      let blocked = false;
      let nextAllowed = '';
      if (m && m.lastSectorUpdate) {
        const last = new Date(m.lastSectorUpdate);
        if (!isNaN(last.getTime())) {
          const next = new Date(last.getTime() + COOLDOWN_DAYS * 24 * 3600 * 1000);
          if (next.getTime() > Date.now()) {
            blocked = true;
            nextAllowed = next.getFullYear() + '-' + ('0' + (next.getMonth() + 1)).slice(-2) + '-' + ('0' + next.getDate()).slice(-2);
          }
        }
      }
      self.setData({ current: current, selected: current, blocked: blocked, nextAllowed: nextAllowed, loading: false });
    }).catch(function () {
      self.setData({ loading: false });
    });
  },
  pick(e) {
    if (this.data.blocked) return;
    this.setData({ selected: e.currentTarget.dataset.value });
  },
  next() {
    const self = this;
    const value = this.data.selected;
    if (!value) return;
    if (value === this.data.current) {
      wx.navigateTo({ url: '/pages/profile-edit/profile-edit' });
      return;
    }
    // Schedule 2 §3.5.3 — notify the API, then continue in Update profile.
    api.sectorChanged(auth.getMemberId()).catch(function () {}).then(function () {
      wx.navigateTo({ url: '/pages/profile-edit/profile-edit' });
    });
  }
});
