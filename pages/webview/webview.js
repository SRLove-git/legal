const safeArea = require('../../services/safe-area.js');
const h5 = require('../../services/h5.js');

// Anything the web-view reports is a platform message ("web-view load failed due
// to not in domain list", "The page did not finish loading.") and means nothing
// to a reader, so nothing technical reaches the page: the fallback only offers
// the link. The message itself stays in the console for support and QA.
function logFailure(message) {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('[webview] ' + message);
  }
}

Page({
  behaviors: [safeArea],
  data: { url: '', title: '', failed: false },
  onLoad(options) {
    const url = decodeURIComponent(options.url || '');
    this.setData({ url: url, title: decodeURIComponent(options.title || '') });
    wx.setNavigationBarTitle({ title: this.data.title || 'LegalOne' });
    // A blocked 业务域名 can leave the web-view blank without firing an error,
    // so fall back to the copy-link panel unless the page reports a load.
    this.timer = setTimeout(() => {
      if (!this.loaded) {
        logFailure('timeout: ' + this.data.url);
        this.setData({ failed: true });
      }
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
    const detail = (e && e.detail) || {};
    logFailure(detail.errMsg || 'the web view could not load the page');
    this.setData({ failed: true });
  },
  copy() {
    h5.copy(this.data.url);
  },
  retry() {
    this.loaded = false;
    this.setData({ failed: false });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.loaded) {
        logFailure('timeout: ' + this.data.url);
        this.setData({ failed: true });
      }
    }, 12000);
  }
});
