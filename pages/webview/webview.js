const safeArea = require('../../services/safe-area.js');
const h5 = require('../../services/h5.js');

Page({
  behaviors: [safeArea],
  data: { url: '', title: '', failed: false, reason: '' },
  onLoad(options) {
    const url = decodeURIComponent(options.url || '');
    this.setData({ url: url, title: decodeURIComponent(options.title || '') });
    wx.setNavigationBarTitle({ title: this.data.title || 'LegalOne' });
    // A blocked 业务域名 can leave the web-view blank without firing an error,
    // so fall back to the copy-link panel unless the page reports a load.
    this.timer = setTimeout(() => {
      if (!this.loaded) this.setData({ failed: true, reason: 'The page did not finish loading.' });
    }, 12000);
  },
  onUnload() {
    if (this.timer) clearTimeout(this.timer);
  },
  onLoaded() {
    this.loaded = true;
    if (this.timer) clearTimeout(this.timer);
  },
  onError(e) {
    // web-view failed (usually an unconfigured 业务域名) — fall back to copy-link.
    // The web-view's own message is kept on screen because it is what separates a
    // blocked domain from a page the server does not serve.
    const detail = (e && e.detail) || {};
    this.setData({ failed: true, reason: detail.errMsg || 'The web view could not load the page.' });
  },
  copy() {
    h5.copy(this.data.url);
  },
  retry() {
    this.loaded = false;
    this.setData({ failed: false, reason: '' });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.loaded) this.setData({ failed: true, reason: 'The page did not finish loading.' });
    }, 12000);
  }
});
