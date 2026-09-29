const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');
const h5 = require('../../services/h5.js');
const announcementTarget = require('../../services/announcement-target.js');
const contentActions = require('../../services/content-actions.js');

Page({
  behaviors: [safeArea, breadcrumb, contentActions],
  data: {
    item: null,
    loading: true,
    error: ''
  },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const self = this;
    if (!id) {
      this.setData({ loading: false, error: 'Announcement not found.' });
      return;
    }
    api.getAnnouncementDetail(id)
      .then(function (item) {
        if (item) {
          self.showOrReuse(item);
          return;
        }
        const fallback = fb.announcements.find(function (x) { return x.id === id; });
        if (fallback) self.showOrReuse(fallback);
        else self.setData({ item: null, loading: false, error: 'Announcement not found.' });
      })
      .catch(function () {
        const fallback = fb.announcements.find(function (x) { return x.id === id; });
        if (fallback) self.showOrReuse(fallback);
        else self.setData({ item: null, loading: false, error: 'Unable to load this announcement. Please try again.' });
      });
  },
  showOrReuse(item) {
    const reusedUrl = announcementTarget.detailUrl(item);
    const self = this;
    if (reusedUrl) {
      wx.redirectTo({
        url: reusedUrl,
        fail: function () {
          self.setData({ item: item, loading: false, error: '' });
          self.configureContentActions('announcement', item.id,
            '/announcement_list/' + item.id + '/' + encodeURIComponent(item.headline || ''), 'announcement');
        }
      });
      return;
    }
    this.setData({ item: item, loading: false, error: '' });
    this.configureContentActions('announcement', item.id,
      '/announcement_list/' + item.id + '/' + encodeURIComponent(item.headline || ''), 'announcement');
  },
  onShow() {
    if (this.data.saveContentId) this.refreshSavedStatus();
  },
  openUrl() {
    const item = this.data.item;
    const url = item && item.url;
    if (!url) return;
    h5.open(url, item.headline || 'Announcement');
  },
  onShareAppMessage() {
    const item = this.data.item || {};
    return {
      title: item.headline || 'LegalOne announcement',
      path: '/pages/announcement-detail/announcement-detail?id=' + encodeURIComponent(item.id || ''),
      imageUrl: item.image || undefined
    };
  },
  onShareTimeline() {
    const item = this.data.item || {};
    return {
      title: item.headline || 'LegalOne announcement',
      query: 'id=' + encodeURIComponent(item.id || ''),
      imageUrl: item.image || undefined
    };
  }
});
