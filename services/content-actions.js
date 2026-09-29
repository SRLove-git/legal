const api = require('./api.js');

// Shared Share/Save state for content detail pages. The visual Share control is
// supplied by templates/content-actions.wxml; WeChat calls each page's own
// onShareAppMessage handler when its transparent open-type button is pressed.
module.exports = Behavior({
  data: {
    saved: false,
    savedItemId: '',
    saving: false,
    saveContentType: '',
    saveContentId: '',
    saveOriginalPath: '',
    saveContentLabel: 'item'
  },

  methods: {
    configureContentActions(contentType, contentId, originalPath, contentLabel) {
      this.setData({
        saveContentType: contentType || '',
        saveContentId: contentId || '',
        saveOriginalPath: originalPath || '',
        saveContentLabel: contentLabel || 'item',
        saved: false,
        savedItemId: ''
      });
      this.refreshSavedStatus();
    },

    refreshSavedStatus() {
      const token = wx.getStorageSync('X-ACCESS-TOKEN');
      const memberId = wx.getStorageSync('memberId');
      const contentType = this.data.saveContentType;
      const contentId = this.data.saveContentId;
      if (!token || !memberId || !contentType || !contentId) {
        this.setData({ saved: false, savedItemId: '' });
        return;
      }

      const self = this;
      api.getSavedStatus(memberId, contentType, contentId).then(function (result) {
        // Do not apply a late response after this behavior has been configured
        // for different content.
        if (self.data.saveContentType !== contentType || self.data.saveContentId !== contentId) return;
        self.setData({
          saved: !!(result && result.saved),
          savedItemId: (result && result.savedItemId) || ''
        });
      }).catch(function () {
        if (self.data.saveContentType === contentType && self.data.saveContentId === contentId) {
          self.setData({ saved: false, savedItemId: '' });
        }
      });
    },

    onSave() {
      if (this.data.saving) return;
      const token = wx.getStorageSync('X-ACCESS-TOKEN');
      const memberId = wx.getStorageSync('memberId');
      if (!token || !memberId) {
        const label = this.data.saveContentLabel || 'item';
        wx.showModal({
          title: 'Login required',
          content: 'Login to save this ' + label,
          confirmText: 'Login',
          success: function (result) {
            if (result.confirm) wx.navigateTo({ url: '/pages/login/login' });
          }
        });
        return;
      }

      const contentType = this.data.saveContentType;
      const contentId = this.data.saveContentId;
      if (!contentType || !contentId) return;
      if (this.data.saved && !this.data.savedItemId) {
        this.refreshSavedStatus();
        return;
      }

      const self = this;
      const wasSaved = this.data.saved;
      this.setData({ saving: true });
      const operation = wasSaved
        ? api.unsaveItem(memberId, this.data.savedItemId)
        : api.saveItem(memberId, contentType, contentId, this.data.saveOriginalPath);
      operation.then(function (result) {
        self.setData({
          saved: !wasSaved,
          savedItemId: wasSaved ? '' : ((result && (result.id || result.savedItemId)) || ''),
          saving: false
        });
      }).catch(function () {
        self.setData({ saving: false });
        wx.showToast({ title: 'Unable to update saved items', icon: 'none' });
      });
    }
  }
});
