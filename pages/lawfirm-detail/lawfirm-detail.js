const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page({
  data: { item: null },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const name = decodeURIComponent(options.name || '');
    const self = this;
    const fallback = function () {
      const item = fb.lawfirms.find(function (x) {
        return (id && x.id === id) || (name && x.name === name);
      });
      if (item) {
        item.overview = 'This law firm is listed in the LegalOne Global directory. Its full profile is available on the LegalOne Global website.';
      }
      self.setData({ item: item || null });
    };
    if (id) {
      api.getLawfirmDetail(id).then(function (item) {
        self.setData({ item: item || null });
      }).catch(fallback);
    } else {
      fallback();
    }
  }
});
