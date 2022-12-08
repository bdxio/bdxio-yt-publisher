const escapeHtml = s => s.replace(/([&<>"'])/g, "$1");

const capitalize = name =>
  name.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());

const formatMarkdown = md =>
  md
    .replace(/\*\*/g, "*")
    .replaceAll("</br>", "\\n")
    .replaceAll("<br>", "\\n")
    .replaceAll("<b>", "*")
    .replaceAll("</b>", "*")
    .replaceAll("<", "&lt;")
    .replaceAll("/>", "&gt;");

module.exports = {
  escapeHtml,
  capitalize,
  formatMarkdown
};
