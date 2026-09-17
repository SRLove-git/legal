const safeArea = require('../../services/safe-area.js');
Page({
  behaviors: [safeArea],
  data: {
    hero: {
      title: 'ADVANCING LEGAL EXCELLENCE WORLDWIDE',
      subtitle: 'Recognition. Innovation. Impact.',
      cta: 'Read company brochure'
    },
    intro: 'LegalOne Global Limited, trading as "LegalOne", is an award winning, independent rating and research company recognised as a leader in empowering C-suite executives, general counsel, and decision-makers worldwide. We specialise in delivering authoritive analytic data and critical insights to corporate counsel and business leaders, supporting strategic decision-making at local, regional and global levels. Our work includes exclusive reviews of commercial deals, dispute cases, and intellectual property matters, complemented by direct ratings and client testimonials on legal advisors.',
    standards: [
      { title: 'ISO 9001:2015 Quality Management Certified', desc: 'LegalOne maintains ISO 9001:2015 quality management certification, demonstrating a commitment to consistent service excellence.' },
      { title: 'Digital Object Identifier Prefix 10.62436', desc: 'LegalOne publications are registered with the DOI system for persistent, citable identification of digital content.' },
      { title: 'ISSN 3006-2756 registered publications', desc: 'Publications are ISSN-registered, supporting discoverability and archival standards for serial content.' }
    ],
    signatories: [
      { title: 'United Nations Principles for Responsible Investment (PRI)', desc: 'As a PRI Service Provider Signatory, LegalOne supports the advancement of responsible investment by providing legal intelligence, research, ratings and business information services.' },
      { title: 'ICMA Hong Kong Code of Conduct for ESG Ratings and Data Products Providers', desc: 'LegalOne adheres to the ICMA Hong Kong Code of Conduct for ESG Ratings and Data Products Providers.' },
      { title: 'Japan Financial Services Agency Code of Conduct for ESG Evaluation and Data Providers', desc: 'LegalOne has endorsed the Japan Financial Services Agency (JFSA) Code of Conduct for ESG Evaluation and Data Providers.' }
    ],
    memberships: [
      { title: "The Chinese Manufacturers' Association of Hong Kong", desc: 'LegalOne is part of The Chinese Manufacturers’ Association of Hong Kong (CMA) Professional Consultant Team.' },
      { title: 'Hong Kong Trade Development Council', desc: 'LegalOne is listed on the Hong Kong Trade Development Council Sourcing platform.' }
    ],
    esg: [
      'ESG Pledge Scheme by The Chinese Manufacturers’ Association of Hong Kong (CMA)',
      'Business Sector Integrity Charter by Independent Commission Against Corruption (ICAC)',
      'ESG One Green Member by Hong Kong Productivity Council',
      'Hong Kong Awards for Environmental Excellence 2024 Appreciation Certificate',
      'HKQAA ESG Connect Program by Hong Kong Quality Assurance Agency'
    ],
    partnerships: [
      { title: 'International Trademark Association (INTA)', items: ['INTA 2025 Annual Meeting in San Diego, United States', 'INTA 2026 Annual Meeting in London, United Kingdom'] },
      { title: 'International Association for the Protection of Intellectual Property (AIPPI)', items: ['2024 AIPPI World Congress in Hangzhou, China', '2025 AIPPI World Congress in Yokohama, Japan', '2026 AIPPI World Congress in Hamburg, Germany'] },
      { title: 'Business of IP Asia Forum (BIP Asia)', items: ['Business of IP Asia Forum 2024', 'Business of IP Asia Forum 2025'] },
      { title: 'China International Economic And Trade Arbitration Commission (CIETAC)', items: ['18th Frankfurt Investment Arbitration Moot Court', 'CIETAC International Arbitration Institute: 2025-2026 Tribunal Secretary Training Course'] },
      { title: 'LexisNexis', items: ['LexisNexis 5th In-House Legal and Compliance Conference 2024'] },
      { title: 'China Trademark Association (CTA)', items: ["China Trademark Association's Trademark and Brand Knowledge Competition (First Edition)"] }
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
  }
});
