// Session helpers (Schedule 2 §1 / Annex B §0).
// Token lives in persistent storage and is sent as X-ACCESS-TOKEN; no cookie reliance.
const api = require('./api.js');

function getToken() {
  try { return wx.getStorageSync('X-ACCESS-TOKEN') || ''; } catch (e) { return ''; }
}

function getMemberId() {
  try { return wx.getStorageSync('memberId') || ''; } catch (e) { return ''; }
}

function isLoggedIn() {
  return !!(getToken() && getMemberId());
}

function saveSession(token, memberId) {
  wx.setStorageSync('X-ACCESS-TOKEN', token || '');
  wx.setStorageSync('memberId', memberId || '');
}

function clearSession() {
  wx.removeStorageSync('X-ACCESS-TOKEN');
  wx.removeStorageSync('memberId');
  wx.removeStorageSync('X-CAPTCHA-VERIFIED');
  wx.removeStorageSync('X-OTP-TOKEN');
}

// Annex B §2.2 — call on launch / before member routes; failure means logged out.
function checkSession() {
  if (!isLoggedIn()) return Promise.resolve(false);
  return api.isValidToken(getMemberId()).then(function () {
    return true;
  }).catch(function () {
    clearSession();
    return false;
  });
}

function requireLogin() {
  if (isLoggedIn()) return true;
  wx.redirectTo({ url: '/pages/login/login' });
  return false;
}

// Schedule 2 §3.4 — gate on supplementaryInfoProvided (do not invent rules).
function isProfileComplete(member) {
  return !!(member && member.supplementaryInfoProvided);
}

module.exports = {
  getToken: getToken,
  getMemberId: getMemberId,
  isLoggedIn: isLoggedIn,
  saveSession: saveSession,
  clearSession: clearSession,
  checkSession: checkSession,
  requireLogin: requireLogin,
  isProfileComplete: isProfileComplete
};
