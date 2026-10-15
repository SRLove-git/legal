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

// The website's member pages bounce to their sign-in form with a *relative*
// redirect (`location.replace("./sign_in")`), so from /member_survey/<id> they
// land on /member_survey/sign_in — which their own router matches as another
// member page, whose guard redirects again. Every hop is a real document load,
// so the mini program's web-view flashes white forever. These member pages need
// the website's own login (which the mini program cannot hand over), so after a
// few loads in a row we stop the loop and offer the link for a browser instead.
const LOOP_WINDOW_MS = 8000;
const LOOP_LOADS = 3;

Page({
  behaviors: [safeArea],
  data: { url: '', title: '', failed: false, loop: false },
  onLoad(options) {
    const url = decodeURIComponent(options.url || '');
    this.setData({ url: url, title: decodeURIComponent(options.title || ''), loop: false });
    wx.setNavigationBarTitle({ title: this.data.title || 'LegalOne' });
    this.startWatch();
  },
  onUnload() {
    if (this.timer) clearTimeout(this.timer);
  },
  // A blocked 业务域名 can leave the web-view blank without firing an error,
  // so fall back to the copy-link panel unless the page reports a load.
  startWatch() {
    this.loaded = false;
    this.loads = 0;
    this.firstLoadAt = 0;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.loaded) {
        logFailure('timeout: ' + this.data.url);
        this.setData({ failed: true });
      }
    }, 12000);
  },
  onLoaded() {
    const now = Date.now();
    this.loaded = true;
    if (this.timer) clearTimeout(this.timer);
    if (!this.firstLoadAt) this.firstLoadAt = now;
    this.loads = (this.loads || 0) + 1;
    if (this.loads >= LOOP_LOADS && now - this.firstLoadAt <= LOOP_WINDOW_MS) {
      logFailure('reload loop: ' + this.loads + ' loads of ' + this.data.url);
      this.setData({ failed: true, loop: true });
    }
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
    this.setData({ failed: false, loop: false });
    this.startWatch();
  }
});
