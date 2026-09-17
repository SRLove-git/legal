const safeArea = require('../../services/safe-area.js');
const h5 = require('../../services/h5.js');
Page({
  behaviors: [safeArea],
  data: {
    hero: {
      title: 'ADVANCING LEGAL EXCELLENCE WORLDWIDE',
      subtitle: 'Recognition. Innovation. Impact.',
      cta: 'Read company brochure'
    },
    awards: [
      { title: 'CAPITAL Service & Innovative Product Awards 2026', desc: 'Professional Rating Organisation Service Award' },
      { title: 'WatersTechnology Asia Awards 2026', desc: 'Best ESG data provider', link: '/articles/a-1786424894352' },
      { title: 'HKQAA Hong Kong Green and Sustainability Contribution Awards 2026', desc: 'Gold Pioneer for ESG Connect (Governance)' },
      { title: 'Capital Finance International Awards 2025', desc: 'Outstanding Independent Global Ratings Agency', link: '/articles/a-1759132724394' },
      { title: 'Capital Finance International Awards 2025', desc: 'Global Business Intelligence Champion', link: '/articles/a-1759132724394' },
      { title: 'Hong Kong Economic Journal\u2019s Corporate Brand Awards of Excellence 2025', desc: 'Outstanding Rating Agency Award', link: '/articles/a-1748858144199' },
      { title: 'IJGlobal Investor Awards 2025', desc: 'Newcomer of The Year, APAC' },
      { title: 'TVB ESG Awards 2025', desc: 'ESG Special Recognition Award', link: '/articles/a-1774430792553' },
      { title: 'Hainan International Intellectual Property Trade Conference (IPTC)', desc: 'Free Trade Port International Exhibition Contribution Award 2025' }
    ],
    intro: 'LegalOne Global Limited, trading as "LegalOne", is an award winning, independent rating and research company recognised as a leader in empowering C-suite executives, general counsel, and decision-makers worldwide. We specialise in delivering authoritive analytic data and critical insights to corporate counsel and business leaders, supporting strategic decision-making at local, regional and global levels. Our work includes exclusive reviews of commercial deals, dispute cases, and intellectual property matters, complemented by direct ratings and client testimonials on legal advisors.',
    standards: [
      { title: 'ISO 9001:2015 Quality Management Certified', desc: 'LegalOne maintains ISO 9001:2015 quality management certification, demonstrating a commitment to consistent service excellence.' },
      { title: 'Digital Object Identifier Prefix 10.62436', desc: 'LegalOne publications are registered with the DOI system for persistent, citable identification of digital content.' },
      { title: 'ISSN 3006-2756 registered publications', desc: 'Publications are ISSN-registered, supporting discoverability and archival standards for serial content.', link: 'https://portal.issn.org/resource/ISSN/3006-2756' }
    ],
    signatories: [
      { title: 'United Nations Principles for Responsible Investment (PRI)', desc: 'As a PRI Service Provider Signatory, LegalOne supports the advancement of responsible investment by providing legal intelligence, research, ratings and business information services.', link: '/articles/a-1783042931610' },
      { title: 'ICMA Hong Kong Code of Conduct for ESG Ratings and Data Products Providers', desc: 'LegalOne adheres to the ICMA Hong Kong Code of Conduct for ESG Ratings and Data Products Providers.', link: '/esgcodehk' },
      { title: 'Japan Financial Services Agency Code of Conduct for ESG Evaluation and Data Providers', desc: 'LegalOne has endorsed the Japan Financial Services Agency (JFSA) Code of Conduct for ESG Evaluation and Data Providers.', link: '/esgcodejp-jp' }
    ],
    memberships: [
      { title: "The Chinese Manufacturers' Association of Hong Kong", desc: 'LegalOne is part of The Chinese Manufacturers’ Association of Hong Kong (CMA) Professional Consultant Team.', link: '/articles/a-1781748892365' },
      { title: 'Hong Kong Trade Development Council', desc: 'LegalOne is listed on the Hong Kong Trade Development Council Sourcing platform.' }
    ],
    esg: [
      { title: 'ESG Pledge Scheme by The Chinese Manufacturers’ Association of Hong Kong (CMA)' },
      { title: 'Business Sector Integrity Charter by Independent Commission Against Corruption (ICAC)' },
      { title: 'ESG One Green Member by Hong Kong Productivity Council', link: '/articles/a-1756111545265' },
      { title: 'Hong Kong Awards for Environmental Excellence 2024 Appreciation Certificate' },
      { title: 'HKQAA ESG Connect Program by Hong Kong Quality Assurance Agency' }
    ],
    partnerships: [
      { title: 'International Trademark Association (INTA)', items: ['INTA 2025 Annual Meeting in San Diego, United States', 'INTA 2026 Annual Meeting in London, United Kingdom'], link: '/articles/a-1779178065721' },
      { title: 'International Association for the Protection of Intellectual Property (AIPPI)', items: ['2024 AIPPI World Congress in Hangzhou, China', '2025 AIPPI World Congress in Yokohama, Japan', '2026 AIPPI World Congress in Hamburg, Germany'], link: '/articles/a-1757824580101' },
      { title: 'Business of IP Asia Forum (BIP Asia)', items: ['Business of IP Asia Forum 2024', 'Business of IP Asia Forum 2025'], link: '/articles/a-1761553247907' },
      { title: 'China International Economic And Trade Arbitration Commission (CIETAC)', items: ['18th Frankfurt Investment Arbitration Moot Court', 'CIETAC International Arbitration Institute: 2025-2026 Tribunal Secretary Training Course'] },
      { title: 'LexisNexis', items: ['LexisNexis 5th In-House Legal and Compliance Conference 2024'], link: '/articles/a-1730725395549' },
      { title: 'China Trademark Association (CTA)', items: ["China Trademark Association's Trademark and Brand Knowledge Competition (First Edition)"], link: '/articles/a-1786411451817' },
      { title: 'Hong Kong Legal Walk', items: [], link: '/articles/a-1730192096504' },
      { title: 'Compliance PLUS', items: [], link: '/articles/a-1724145895208' }
    ],
    libraries: 'The LegalOne Deals of the Year yearbook has been archived in the collections of several renowned university libraries, national libraries, and embassies worldwide.',
    contact: {
      address: 'Unit A1, 18/F, Lippo Leighton Tower, 103 Leighton Road, Causeway Bay, Hong Kong SAR',
      phone: '+852 31637581',
      general: 'enquiry@legaloneglobal.com',
      editorial: 'editorial@legaloneglobal.com',
      linkedin: 'LegalOne',
      wechat: 'LegalOne Global Limited (legaloneofficial)'
    }
  },
  // "Explore more" targets mirror the website: LegalOne pages open inside the mini
  // program (article detail, ESG codes), third-party pages offer copy-link.
  onExplore(e) {
    const d = e.currentTarget.dataset;
    const link = d.link || '';
    const title = d.title || '';
    if (!link) return;
    if (/^https?:\/\//i.test(link)) {
      h5.openExternal(link, title);
      return;
    }
    if (link.indexOf('/articles/') === 0) {
      wx.navigateTo({
        url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(link.replace('/articles/', '')) + '&title=' + encodeURIComponent(title)
      });
      return;
    }
    if (link === '/esgcodehk') {
      wx.navigateTo({ url: '/pages/esg/esg' });
      return;
    }
    if (link === '/esgcodejp-jp') {
      wx.navigateTo({ url: '/pages/esg-jp/esg-jp' });
      return;
    }
    h5.open(link, title);
  }
});
