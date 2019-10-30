const escapeHtml = s =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const capitalize = name =>
  name.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());

const replaceLast = (str, pattern, replacement) => {
  if (str == null || typeof replacement === 'undefined') return str;
  pattern = '' + pattern;
  let i = str.lastIndexOf(pattern);
  if (i < 0) return str;
  let leftPart = str.substring(0, i);
  let rightPart = str.substring(i + pattern.length, str.length);
  return leftPart + replacement + rightPart;
}

module.exports = {
  escapeHtml,
  capitalize,
  replaceLast
};
