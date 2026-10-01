const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const h5 = require('../../services/h5.js');
Page({
  behaviors: [safeArea, breadcrumb],
  data: {
    hero: {
      title: 'ADVANCING LEGAL EXCELLENCE WORLDWIDE',
      subtitle: 'Recognition. Innovation. Impact.',
      brochureLabel: 'Read company brochure',
      // The website opens the flipbook e-magazine in a new tab; each language is a
      // separate file id on legaloneglobal.com/emagazine.
      brochures: [
        { label: 'English', url: '/emagazine/index.html?file=362da2c302&title=LegalOne%20Brochure' },
        { label: '繁體中文', url: '/emagazine/index.html?file=73334ffbb1&title=LegalOne%20Brochure' },
        { label: '简体中文', url: '/emagazine/index.html?file=1269112958&title=LegalOne%20Brochure' }
      ]
    },
    awards: [
      { title: 'CAPITAL Service & Innovative Product Awards 2026', desc: 'Professional Rating Organisation Service Award', image: 'https://www.legaloneglobal.com/images/AboutUs/awards-and-recognitions/capital-service-innovative-product-awards-2026-professional-rating-organisation-service-award.png' },
      { title: 'WatersTechnology Asia Awards 2026', desc: 'Best ESG data provider', image: 'https://www.legaloneglobal.com/images/AboutUs/awards-and-recognitions/waterstechnology-asia-awards-2026-best-esg-data-provider.png', link: '/articles/a-1786424894352' },
      { title: 'HKQAA Hong Kong Green and Sustainability Contribution Awards 2026', desc: 'Gold Pioneer for ESG Connect (Governance)', image: 'https://www.legaloneglobal.com/images/AboutUs/awards-and-recognitions/hkqaa-green-sustainability-contribution-awards-2026-gold-pioneer.png' },
      { title: 'Capital Finance International Awards 2025', desc: 'Outstanding Independent Global Ratings Agency', image: 'https://www.legaloneglobal.com/images/AboutUs/awards-and-recognitions/cfi-outstanding-independent-global-ratings-agency-2025.png', link: '/articles/a-1759132724394' },
      { title: 'Capital Finance International Awards 2025', desc: 'Global Business Intelligence Champion', image: 'https://www.legaloneglobal.com/images/AboutUs/awards-and-recognitions/cfi-global-business-intelligence-champion-2025.png', link: '/articles/a-1759132724394' },
      { title: 'Hong Kong Economic Journal\u2019s Corporate Brand Awards of Excellence 2025', desc: 'Outstanding Rating Agency Award', image: 'https://www.legaloneglobal.com/images/AboutUs/awards-and-recognitions/hkej-corporate-brand-awards-of-excellence-2025.png', link: '/articles/a-1748858144199' },
      { title: 'IJGlobal Investor Awards 2025', desc: 'Newcomer of The Year, APAC', image: 'https://www.legaloneglobal.com/images/AboutUs/awards-and-recognitions/ijglobal-investor-awards-2025-newcomer-apac.jpg' },
      { title: 'TVB ESG Awards 2025', desc: 'ESG Special Recognition Award', image: 'https://www.legaloneglobal.com/images/AboutUs/awards-and-recognitions/tvb-esg-awards-2025-esg-special-recognition.png', link: '/articles/a-1774430792553' },
      { title: 'Hainan International Intellectual Property Trade Conference (IPTC)', desc: 'Free Trade Port International Exhibition Contribution Award 2025', image: 'https://www.legaloneglobal.com/images/AboutUs/awards-and-recognitions/iptc-free-trade-port-exhibition-contribution-award-2025.png' }
    ],
    intro: 'LegalOne Global Limited, trading as "LegalOne", is an award winning, independent rating and research company recognised as a leader in empowering C-suite executives, general counsel, and decision-makers worldwide. We specialise in delivering authoritive analytic data and critical insights to corporate counsel and business leaders, supporting strategic decision-making at local, regional and global levels. Our work includes exclusive reviews of commercial deals, dispute cases, and intellectual property matters, complemented by direct ratings and client testimonials on legal advisors.',
    standards: [
      { title: 'ISO 9001:2015 Quality Management Certified', desc: 'LegalOne maintains ISO 9001:2015 quality management certification, demonstrating a commitment to consistent service excellence.', image: 'https://www.legaloneglobal.com/images/AboutUs/standards-and-identifiers/iso-9001-2015-quality-management.png' },
      { title: 'Digital Object Identifier Prefix 10.62436', desc: 'LegalOne publications are registered with the DOI system for persistent, citable identification of digital content.', image: 'https://www.legaloneglobal.com/images/AboutUs/standards-and-identifiers/doi-prefix-10-62436.png' },
      { title: 'ISSN 3006-2756 registered publications', desc: 'Publications are ISSN-registered, supporting discoverability and archival standards for serial content.', image: 'https://www.legaloneglobal.com/images/AboutUs/standards-and-identifiers/issn-3006-2756.jpg', link: 'https://portal.issn.org/resource/ISSN/3006-2756' }
    ],
    signatories: [
      { title: 'United Nations Principles for Responsible Investment (PRI)', desc: 'As a PRI Service Provider Signatory, LegalOne supports the advancement of responsible investment by providing legal intelligence, research, ratings and business information services.', image: 'https://www.legaloneglobal.com/images/AboutUs/signatories/un-principles-responsible-investment-pri.png', link: '/articles/a-1783042931610' },
      { title: 'ICMA Hong Kong Code of Conduct for ESG Ratings and Data Products Providers', desc: 'LegalOne adheres to the ICMA Hong Kong Code of Conduct for ESG Ratings and Data Products Providers.', image: 'https://www.legaloneglobal.com/images/AboutUs/signatories/icma-hong-kong-code-of-conduct-esg-ratings.png', link: '/esgcodehk' },
      { title: 'Japan Financial Services Agency Code of Conduct for ESG Evaluation and Data Providers', desc: 'LegalOne has endorsed the Japan Financial Services Agency (JFSA) Code of Conduct for ESG Evaluation and Data Providers.', image: 'https://www.legaloneglobal.com/images/AboutUs/signatories/japanese-financial-services-agency-fsa-esg-code-of-conduct.png', link: '/esgcodejp-jp' }
    ],
    memberships: [
      { title: "The Chinese Manufacturers' Association of Hong Kong", desc: 'LegalOne is part of The Chinese Manufacturers’ Association of Hong Kong (CMA) Professional Consultant Team.', link: '/articles/a-1781748892365' },
      { title: 'Hong Kong Trade Development Council', desc: 'LegalOne is listed on the Hong Kong Trade Development Council Sourcing platform.' }
    ],
    membershipImages: [
      { image: 'https://www.legaloneglobal.com/images/AboutUs/advisory-appointments/chinese-manufacturers-association-hong-kong-cma.png' },
      { image: 'https://www.legaloneglobal.com/images/AboutUs/advisory-appointments/hong-kong-trade-development-council-hktdc.png', image2: 'https://www.legaloneglobal.com/images/AboutUs/advisory-appointments/hktdc.com-sourcing.png' }
    ],
    esg: [
      { title: 'ESG Pledge Scheme by The Chinese Manufacturers’ Association of Hong Kong (CMA)' },
      { title: 'Business Sector Integrity Charter by Independent Commission Against Corruption (ICAC)' },
      { title: 'ESG One Green Member by Hong Kong Productivity Council', link: '/articles/a-1756111545265' },
      { title: 'Hong Kong Awards for Environmental Excellence 2024 Appreciation Certificate' },
      { title: 'HKQAA ESG Connect Program by Hong Kong Quality Assurance Agency' }
    ],
    esgImages: [
      'https://www.legaloneglobal.com/images/AboutUs/esg-commitments/cma-esg-pledge-scheme.png',
      'https://www.legaloneglobal.com/images/AboutUs/esg-commitments/icac-business-sector-integrity-charter.png',
      'https://www.legaloneglobal.com/images/AboutUs/esg-commitments/hkpc-esg-one-green-member.png',
      'https://www.legaloneglobal.com/images/AboutUs/esg-commitments/hong-kong-awards-environmental-excellence-2024.png',
      'https://www.legaloneglobal.com/images/AboutUs/esg-commitments/hkqaa-esg-connect-program.png'
    ],
    partnerships: [
      { title: 'International Trademark Association (INTA)', items: ['INTA 2025 Annual Meeting in San Diego, United States', 'INTA 2026 Annual Meeting in London, United Kingdom'], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/international-trademark-association-inta.png', link: '/articles/a-1779178065721' },
      { title: 'International Association for the Protection of Intellectual Property (AIPPI)', items: ['2024 AIPPI World Congress in Hangzhou, China', '2025 AIPPI World Congress in Yokohama, Japan', '2026 AIPPI World Congress in Hamburg, Germany'], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/international-association-protection-intellectual-property-aippi.png', link: '/articles/a-1757824580101' },
      { title: 'Business of IP Asia Forum (BIP Asia)', items: ['Business of IP Asia Forum 2024', 'Business of IP Asia Forum 2025'], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/business-of-ip-asia-forum-bip-asia.png', link: '/articles/a-1761553247907' },
      { title: 'China International Economic And Trade Arbitration Commission (CIETAC)', items: ['18th Frankfurt Investment Arbitration Moot Court', 'CIETAC International Arbitration Institute: 2025-2026 Tribunal Secretary Training Course'], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/china-international-economic-trade-arbitration-commission-cietac.png' },
      { title: 'LexisNexis', items: ['LexisNexis 5th In-House Legal and Compliance Conference 2024'], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/lexisnexis.png', link: '/articles/a-1730725395549' },
      { title: 'China Trademark Association (CTA)', items: ["China Trademark Association's Trademark and Brand Knowledge Competition (First Edition)"], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/china-trademark-association-cta.png', link: '/articles/a-1786411451817' },
      { title: 'China Intellectual Property Annual Conference by IPPH under the China National Intellectual Property Administration', items: ['15th China Intellectual Property Annual Conference'], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/china-intellectual-property-annual-conference-cipac.png' },
      { title: 'Nexus Conference', items: ['Banking, Financial Services and Insurance (BFSI) Nexus Conference in Amsterdam', 'Brand Protection Nexus 2025 in Embassy Suites by Hilton San Francisco Airport, United States'], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/nexus-conference.png' },
      { title: 'The International Intellectual Property Law Association (IIPLA)', items: ['The 29th Edition of the IIPLA 2026 China'], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/international-intellectual-property-law-association-iipla.png' },
      { title: 'ITechLaw', items: [], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/itechlaw.png' },
      { title: 'Hong Kong Legal Walk', items: [], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/hong-kong-legal-walk.png', link: '/articles/a-1730192096504' },
      { title: 'Compliance PLUS', items: [], image: 'https://www.legaloneglobal.com/images/AboutUs/international-engagement/compliance-plus-conference.png', link: '/articles/a-1724145895208' }
    ],
    libraries: 'The LegalOne Deals of the Year yearbook has been archived in the collections of several renowned university libraries, national libraries, and embassies worldwide.',
    libraryMap: 'https://www.legaloneglobal.com/images/AboutUs/deals-of-the-year-archived-worldwide/deals-of-the-year-archive-world-map.png',
    libraryLogos: [
      'bibliotheque-nationale-de-france.png',
      'bodleian-libraries-university-of-oxford.png',
      'british-library.png',
      'bruneian-consulate-hong-kong.png',
      'china-university-political-science-and-law.png',
      'columbia-university-libraries.png',
      'harvard-library.png',
      'hong-kong-university-libraries.png',
      'library-of-congress.png',
      'macau-university-science-and-technology-library.png',
      'mit-libraries.png',
      'nanjing-university-library.png',
      'national-diet-library-japan.png',
      'national-library-of-australia.png',
      'national-library-of-china.png',
      'national-library-board-singapore.png',
      'peking-university-library.png',
      'princeton-university-library.png',
      'run-run-shaw-library-city-university-hong-kong.png',
      'southwest-university-political-science-and-law.png',
      'chinese-university-hong-kong-library.png',
      'tsinghua-university-library.png',
      'uc-berkeley-library.png',
      'ucla-library.png',
      'university-of-cambridge-library.png',
      'yale-library.png',
      'zhejiang-university-library.png'
    ].map((file) => 'https://www.legaloneglobal.com/images/AboutUs/deals-of-the-year-archived-worldwide/library-logos/' + file),
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
  },
  openBrochure(e) {
    const url = e.currentTarget.dataset.url || '';
    if (url) h5.open(url, 'LegalOne Brochure');
  },
  previewLibraryMap() {
    const url = this.data.libraryMap;
    if (url) wx.previewImage({ current: url, urls: [url] });
  }
});
