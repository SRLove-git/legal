const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page({
  behaviors: [safeArea],
  data: { item: null },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const self = this;
    if (!id) return;
    api.getAnnouncementDetail(id)
      .then(function (item) { if (item) self.setData({ item: item }); })
      .catch(function () {
        const fallback = fb.announcements.find(function (x) { return x.id === id; });
        self.setData({ item: fallback || null });
      });
  },
  openUrl() {
    const url = this.data.item && this.data.item.url;
    if (!url) return;
    wx.setClipboardData({ data: url, success: function () { wx.showToast({ title: 'Link copied', icon: 'none' }); } });
  }
});
