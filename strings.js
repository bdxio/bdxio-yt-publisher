const escapeHtml = s =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const capitalize = name =>
  name.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());

const replaceLastComma = (str, replacement) => 
  str.replace(/, ([^,]*)$/, replacement + '$1');

module.exports = {
  escapeHtml,
  capitalize,
  replaceLastComma
};
