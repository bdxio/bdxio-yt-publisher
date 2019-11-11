const escapeHtml = s => s.replace(/([&<>"'])/g, "$1");

const capitalize = name =>
  name.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());

module.exports = {
  escapeHtml,
  capitalize
};
