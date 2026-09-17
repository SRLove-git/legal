const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

Page({
  data: { item: null },
  onLoad(options) {
    const id = decodeURIComponent(options.id || '');
    const title = decodeURIComponent(options.title || '');
    const self = this;
    const fallback = function () {
      let item = fb.deals.find(function (x) {
        return (id && x.id === id) || (title && x.title === title);
      });
      if (item) {
        item.body = 'This deal/case has been independently reviewed and recognised by LegalOne Merits. The full record is published on the LegalOne Global website.';
      }
      self.setData({ item: item || null });
    };
    if (id) {
      api.getDealDetail(id).then(function (item) {
        self.setData({ item: item || null });
      }).catch(fallback);
    } else {
      fallback();
    }
  }
});
