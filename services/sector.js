// Schedule 2 §3.5.4 — sector matrix driving the profile form layout.
// orgLabel:      label for the organisation name field
// autocomplete:  firm autocomplete via /api/legal/lawfirms/ (profile only, not E-form)
// positionList:  "dropdown" | "text"
// showPartner:   whether the Partner toggle is shown
const SECTORS = [
  { value: 'Law firm (lawyer)', orgLabel: 'Law firm Name', autocomplete: true, positionList: 'dropdown', showPartner: true },
  { value: 'Law firm (non-lawyer)', orgLabel: 'Law firm Name', autocomplete: true, positionList: 'text', showPartner: false },
  { value: 'IP agency', orgLabel: 'Company Name', autocomplete: false, positionList: 'text', showPartner: false },
  { value: 'Company', orgLabel: 'Company Name', autocomplete: false, positionList: 'text', showPartner: false },
  { value: 'Government', orgLabel: 'Company Name', autocomplete: false, positionList: 'text', showPartner: false },
  { value: 'Academic', orgLabel: 'Company Name', autocomplete: false, positionList: 'text', showPartner: false },
  { value: 'Academic (student)', orgLabel: 'Company Name', autocomplete: false, positionList: 'text', showPartner: false },
  { value: 'Other', orgLabel: 'Company Name', autocomplete: false, positionList: 'text', showPartner: false }
];

function list() {
  return SECTORS.slice();
}

function get(value) {
  for (let i = 0; i < SECTORS.length; i++) {
    if (SECTORS[i].value === value) return SECTORS[i];
  }
  return SECTORS[SECTORS.length - 1];
}

// Schedule 2 §3.5.3 — changing sector clears org / position / location fields.
function clearedOnSectorChange() {
  return ['firmId', 'firmName', 'firmNameLocal', 'position', 'otherPosition', 'isPartner',
    'country', 'otherCountry', 'city', 'otherCity', 'address', 'localAddress'];
}

module.exports = { list: list, get: get, clearedOnSectorChange: clearedOnSectorChange };
