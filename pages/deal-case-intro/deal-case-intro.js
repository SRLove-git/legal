const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
Page({
  behaviors: [safeArea, breadcrumb],
  data: {
    methodology: [
      {
        title: 'Purpose',
        text: 'LegalOne Merits is a three-tier evaluation system recognising outstanding commercial transactions, dispute cases, and IP matters.'
      },
      {
        title: 'Eligibility',
        text: 'You may submit significant transactions or cases preferably from the last 12–24 months. Earlier closed matters are also welcome, but ongoing deals or cases are not eligible.'
      },
      {
        title: 'Policy',
        text: 'Each nominating partner may submit up to two deals/cases per year at no cost. Additional submissions can be arranged upon request.'
      },
      {
        title: 'Outcome',
        text: 'Submissions are reviewed by our editorial and research team. Outstanding deals/cases are awarded LegalOne Merits ratings and listed on our website under the Deals / Cases section.'
      }
    ],
    merits: 'LegalOne Merits ratings are awarded to outstanding deals and cases following our evaluation process. They are awarded on a three-tiered structure, represented by a distinctive badge with one, two or three stripes, denoting "Remarkable", "Exemplary", and "Distinguished" respectively, in ascending order of significance.',
    doty: [
      {
        title: 'LegalOne Deals of The Year China 2024',
        image: '/assets/img/article-0.jpg',
        link: '/pages/article-detail/article-detail?id=a-1754038882395'
      },
      {
        title: 'LegalOne Deals of The Year China 2023',
        image: '/assets/img/article-1.jpg',
        link: '/pages/article-detail/article-detail?id=a-1709819050106'
      }
    ],
    faq: [
      {
        group: 'How to Submit',
        items: [
          {
            q: 'How do I submit my deal or case details?',
            a: 'Submissions can be completed at any time by accessing your online portal. Log into your LegalOne dashboard or register and create a user account. Navigate to the "Account services" menu. Select "Deal/case submission for rating" to activate and complete the online form.'
          },
          {
            q: 'What are your key guidelines for successfully completing the form?',
            a: 'Be thorough yet concise: provide complete details while keeping the submission clear, structured, and easy to read. Structure with context and significance: explain how the matter was complex, unique, or legally innovative. Demonstrate the impact: highlight the challenges, complexities, and commercial value. Define all contributors (involved lawyers): clearly specify the roles and contributions of all participating partners and associates.'
          }
        ]
      },
      {
        group: 'General Submission Information',
        items: [
          {
            q: 'What types of deals or cases can I submit?',
            a: 'We welcome submissions of notable, completed or substantially concluded commercial transactions, dispute cases, and IP matters that highlight complex, innovative or impactful work in which your legal practitioners were involved.'
          },
          {
            q: 'Is there a specific timeframe required for submitted matters?',
            a: 'We prefer matters that have been completed within the last 24 months. However, you are welcome to provide details of earlier closed deals or cases if they carry significant precedent or enduring industry impact.'
          },
          {
            q: 'Do you accept ongoing or active matters?',
            a: 'No. According to our editorial policy, we do not accept any ongoing or active deals and cases. All submitted deals/cases must be fully completed or substantially concluded at the time of submission.'
          },
          {
            q: 'Who is eligible to submit, and who should act as the nominating lawyer?',
            a: 'All practising lawyers in all jurisdictions are welcome to submit their deals and cases to our research team. Preferably, each submission should be proposed by a key partner involved in the deal/case. The nominating partner will be held fully responsible for the accuracy and validity of all information provided.'
          },
          {
            q: 'Can I submit matters that contain confidential information?',
            a: 'If certain aspects of a deal or case are confidential, you must ensure that the text submitted to us is thoroughly redacted, anonymised, or synthesised so it is entirely safe for public distribution. We only publish disclosable details regarding the salient features of a matter.'
          },
          {
            q: 'What is the Fair and Inclusive Policy?',
            a: 'To ensure equal opportunity and platform access for all experienced legal professionals, our Fair and Inclusive Policy allows every nominating partner to submit up to two (2) deals or cases (in which they are involved) per calendar year without any cost.'
          },
          {
            q: 'Can our firm submit more than two matters?',
            a: 'Yes. Whilst the first two submissions per nominating partner are free per calendar year, additional submissions beyond this baseline quota can be processed for an administrative fee. Please contact our client services team at cs@legaloneglobal.com.'
          }
        ]
      },
      {
        group: 'Evaluation and Publication',
        items: [
          {
            q: 'What is the process once a submission is lodged?',
            a: 'Once a submission is accepted by our research team, it undergoes a meticulous evaluation and publication process: lodgement, review of published details, evaluation, editorial discretion, and rating assignment. Outstanding deals and cases will receive our rating — LegalOne Merits.'
          },
          {
            q: 'What are LegalOne Merits and how are they scaled?',
            a: 'LegalOne Merits ratings are awarded on a three-tiered structure, represented by a distinctive badge with one, two or three stripes, denoting "Remarkable", "Exemplary", and "Distinguished" respectively, in ascending order of significance.'
          }
        ]
      }
    ],
    openGroups: {}
  },

  onLoad() {
    // nothing to load; content is static
  },

  toggleGroup(e) {
    const g = e.currentTarget.dataset.group;
    const openGroups = Object.assign({}, this.data.openGroups);
    openGroups[g] = !openGroups[g];
    this.setData({ openGroups });
  },

  goArticle(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  }
});
