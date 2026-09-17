// Schedule 2 §3.9 — H5 opening: web-view preferred, browser / copy-link fallback.
const config = require('../config.js');

function host() {
  return (config.h5Host || '').replace(/\/+$/, '');
}

// Open an absolute or site-relative H5 URL inside the mini program.
function open(url, title) {
  if (!url) {
    wx.showToast({ title: 'No link available', icon: 'none' });
    return;
  }
  const full = /^https?:\/\//i.test(url) ? url : host() + url;
  wx.navigateTo({
    url: '/pages/webview/webview?url=' + encodeURIComponent(full) + '&title=' + encodeURIComponent(title || ''),
    fail: function () { copy(full); }
  });
}

function copy(url) {
  wx.setClipboardData({
    data: url,
    success: function () { wx.showToast({ title: 'Link copied', icon: 'none' }); }
  });
}

module.exports = { host: host, open: open, copy: copy };
