const api = require('./api.js');
const fb = require('./fallback.js');

// Reusable list page controller: server-side pagination by default, or client-side
// paging/filter for endpoints that return a full set (announcements, highlights).
function createListPage(cfg) {
  const PER = cfg.perPage || 12;
  const clientPaging = !!cfg.clientPaging;

  return {
    data: {
      items: [],
      keyword: '',
      page: 1,
      hasMore: true,
      loading: false
    },

    onLoad(options) {
      if (options && options.keyword) {
        this.setData({ keyword: options.keyword });
      }
      this.fetch(true);
    },

    onInput(e) {
      this.setData({ keyword: e.detail.value });
    },

    onSearch() {
      this.fetch(true);
    },

    onReachBottom() {
      if (this.data.hasMore && !this.data.loading) this.fetch(false);
    },

    fetch(reset) {
      if (this.data.loading) return;
      const self = this;
      const page = reset ? 1 : this.data.page + 1;
      const kw = (this.data.keyword || '').trim();
      this.setData({ loading: true });

      if (clientPaging) {
        const loadFull = this._all
          ? Promise.resolve(this._all)
          : cfg.apiFn({ max: 200, start: 1 }).catch(function () { return cfg.fallback; });

        loadFull.then(function (full) {
          self._all = full;
          const filtered = kw
            ? full.filter(function (it) { return cfg.filter(it, kw.toLowerCase()); })
            : full;
          const items = filtered.slice(0, page * PER);
          self.setData({
            items: items,
            page: page,
            hasMore: items.length < filtered.length,
            loading: false
          });
        });
        return;
      }

      const opts = { max: PER, start: (page - 1) * PER + 1 };
      if (kw) opts.search = kw;

      cfg.apiFn(opts).then(function (r) {
        const merged = reset ? r : self.data.items.concat(r);
        self.setData({
          items: merged,
          page: page,
          hasMore: r.length === PER,
          loading: false
        });
      }).catch(function () {
        const filtered = kw
          ? cfg.fallback.filter(function (it) { return cfg.filter(it, kw.toLowerCase()); })
          : cfg.fallback;
        const items = filtered.slice(0, page * PER);
        self.setData({
          items: items,
          page: page,
          hasMore: items.length < filtered.length,
          loading: false
        });
      });
    },

    goDetail(e) {
      const d = e.currentTarget.dataset;
      if (cfg.detailUrl) wx.navigateTo({ url: cfg.detailUrl(d) });
    }
  };
}

module.exports = createListPage;
