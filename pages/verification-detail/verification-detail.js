const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return Number(match[3]) + ' ' + MONTHS[Number(match[2]) - 1] + ' ' + match[1];
}

function normalizeVerification(item) {
  const category = String(item.category || '').toLowerCase() === 'other'
    ? item.otherCategory
    : item.category;
  return {
    id: item.id || '',
    displayName: [item.firstName, item.lastName].filter(Boolean).join(' '),
    lawyerRef: item.lawyerRef || '',
    legalName: item.legalNameOnLicense || '',
    jurisdiction: item.qualifiedToPracticeIn || '',
    licenceNumber: item.registrationId || '',
    category: category || '',
    issuedBy: item.licenseCertIssuedBy || '',
    issueDate: formatDate(item.issueDate),
    expiryDate: formatDate(item.expiry)
  };
}

Page({
  behaviors: [safeArea],
  data: {
    verification: null,
    loading: true,
    error: ''
  },
  onLoad(options) {
    const id = decodeURIComponent((options && options.id) || '');
    if (!id) {
      this.setData({ loading: false, error: 'Verification record not found.' });
      return;
    }
    const self = this;
    api.getVerificationDetail(id).then(function (item) {
      if (!item) {
        self.setData({ loading: false, error: 'Verification record not found.' });
        return;
      }
      self.setData({ verification: normalizeVerification(item), loading: false, error: '' });
    }).catch(function () {
      self.setData({ loading: false, error: 'Unable to load verification details. Please try again.' });
    });
  }
});
