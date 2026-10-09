// Award application forms (PDF) — download then open in the WeChat document viewer.
//
// Two details matter here and both were missing before:
//   * the forms live on the CDN blob container, not on the website host, so the
//     path is resolved through api.documentUrl (the website links window.bloburl +
//     pdfForm);
//   * wx.downloadFile gives back a temp path whose extension is not guaranteed,
//     and wx.openDocument refuses a file it cannot type, so the type is passed
//     explicitly instead of relying on the temp file's name.
const api = require('./api.js');
const h5 = require('./h5.js');

// Values accepted by wx.openDocument's fileType.
const OPENABLE_TYPES = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'docx',
  xls: 'xls',
  xlsx: 'xlsx',
  ppt: 'ppt',
  pptx: 'pptx',
  wps: 'wps',
  et: 'et',
  dps: 'dps'
};

// The form fields (pdfForm / fForm) carry the file name, so the type is read from
// there rather than from the extension-less temp file. Everything here is an
// application form, so PDF is the safe default.
function fileType(path) {
  const match = String(path || '').split(/[?#]/)[0].match(/\.([A-Za-z0-9]+)$/);
  const ext = match ? match[1].toLowerCase() : '';
  return OPENABLE_TYPES[ext] || 'pdf';
}

function fileName(path) {
  const clean = String(path || '').split(/[?#]/)[0];
  const name = clean.split('/').pop();
  return name || 'document';
}

// A failed document is never a dead end: the URL is still valid in a browser, so
// the reason is reported and the link can be copied. The reason is shown verbatim
// because it is the only signal for the most common causes ("url not in domain
// list" = the CDN is missing from the downloadFile 合法域名).
function reportFailure(url, title, reason) {
  wx.showModal({
    title: title || 'Document',
    content: reason + '\n\nCopy the link and open it in a browser instead.',
    confirmText: 'Copy link',
    cancelText: 'Close',
    success: function (res) {
      if (res.confirm) h5.copy(url);
    }
  });
}

function open(path, title) {
  const url = api.documentUrl(path);
  if (!url) {
    wx.showToast({ title: 'No document link', icon: 'none' });
    return;
  }
  const type = fileType(path);
  wx.showLoading({ title: 'Opening...', mask: true });
  wx.downloadFile({
    url: url,
    success: function (res) {
      if (res.statusCode !== 200) {
        wx.hideLoading();
        reportFailure(url, title, 'Download failed (HTTP ' + res.statusCode + ').');
        return;
      }
      // The viewer takes over the screen, so the spinner is closed first.
      wx.hideLoading();
      wx.openDocument({
        filePath: res.tempFilePath,
        fileType: type,
        showMenu: true,
        fail: function (err) {
          reportFailure(url, title, 'Cannot open ' + fileName(path) + ((err && err.errMsg) ? ' (' + err.errMsg + ').' : '.'));
        }
      });
    },
    fail: function (err) {
      wx.hideLoading();
      reportFailure(url, title, 'Download failed' + ((err && err.errMsg) ? ' (' + err.errMsg + ').' : '.'));
    }
  });
}

module.exports = {
  open: open,
  fileType: fileType,
  fileName: fileName
};
