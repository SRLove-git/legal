// Schedule 2 §3.9 — H5 opening: web-view preferred, browser / copy-link fallback.
const config = require('../config.js');

function host() {
  return (config.h5Host || '').replace(/\/+$/, '');
}

// True when the URL lives on the LegalOne host (the only domain a WeChat web-view
// can display, since third-party domains cannot be added to 业务域名).
function isOwnHost(url) {
  const h = host();
  return !!h && String(url).indexOf(h + '/') === 0;
}

// Open an absolute or site-relative H5 URL inside the mini program.
function open(url, title) {
  if (!url) {
    wx.showToast({ title: 'No link available', icon: 'none' });
    return;
  }
  const full = /^https?:\/\//i.test(url) ? url : host() + url;
  if (!isOwnHost(full)) {
    offerCopy(full, title);
    return;
  }
  wx.navigateTo({
    url: '/pages/webview/webview?url=' + encodeURIComponent(full) + '&title=' + encodeURIComponent(title || ''),
    fail: function () { copy(full); }
  });
}

// Third-party sites (for example the ISSN registry) cannot be opened inside a
// mini program web-view, so offer the link for the user's browser instead of
// leaving the tap with no effect.
function offerCopy(url, title) {
  wx.showModal({
    title: title || 'Open link',
    content: url + '\n\nThis link opens on an external website, which WeChat does not allow inside a mini program. Copy the link and paste it into your browser.',
    confirmText: 'Copy link',
    cancelText: 'Cancel',
    success: function (res) { if (res.confirm) copy(url); }
  });
}

function copy(url) {
  wx.setClipboardData({
    data: url,
    success: function () { wx.showToast({ title: 'Link copied', icon: 'none' }); }
  });
}

module.exports = { host: host, isOwnHost: isOwnHost, open: open, openExternal: offerCopy, copy: copy };
