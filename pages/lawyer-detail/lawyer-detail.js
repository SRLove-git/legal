const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page({
  data: { item: null },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const name = decodeURIComponent(options.name || '');
    const self = this;
    const fallback = function () {
      const item = fb.lawyers.find(function (x) {
        return (id && x.id === id) || (name && x.name === name);
      });
      self.setData({ item: item || null });
    };
    if (id) {
      api.getLawyerDetail(id).then(function (item) {
        self.setData({ item: item || null });
      }).catch(fallback);
    } else {
      fallback();
    }
  }
});
