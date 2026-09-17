const safeArea = require('../../services/safe-area.js');
const h5 = require('../../services/h5.js');

Page({
  behaviors: [safeArea],
  data: { url: '', title: '', failed: false },
  onLoad(options) {
    const url = decodeURIComponent(options.url || '');
    this.setData({ url: url, title: decodeURIComponent(options.title || '') });
    wx.setNavigationBarTitle({ title: this.data.title || 'LegalOne' });
  },
  onError() {
    // web-view failed (usually an unconfigured 业务域名) — fall back to copy-link.
    this.setData({ failed: true });
  },
  copy() {
    h5.copy(this.data.url);
  },
  retry() {
    this.setData({ failed: false });
  }
});
