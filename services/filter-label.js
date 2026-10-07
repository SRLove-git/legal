// The website echoes a checkbox dropdown's choice in the field label itself:
// nothing checked keeps the group's default text, one checked option shows that
// option (the site cuts it at 15 characters), and two or more show
// "<count> selected" (window.app.singleFilterSelect / multipleFilterSelect).
const SINGLE_LABEL_LIMIT = 15;

function fieldLabel(defaultLabel, selected) {
  const values = (selected || []).filter(Boolean);
  if (!values.length) return defaultLabel;
  if (values.length > 1) return values.length + ' selected';
  const value = String(values[0]);
  return value.length > SINGLE_LABEL_LIMIT ? value.substr(0, SINGLE_LABEL_LIMIT) + '...' : value;
}

module.exports = {
  fieldLabel: fieldLabel
};
