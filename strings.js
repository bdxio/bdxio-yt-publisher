const escapeHtml = s =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const capitalize = name =>
  name.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());

module.exports = {
  escapeHtml,
  capitalize
};
