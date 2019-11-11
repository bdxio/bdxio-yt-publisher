const escapeHtml = s => s.replace(/([&<>"'])/g, "$1");

const capitalize = name =>
  name.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());

const formatMarkdown = md => md.replace(/\*\*/g, "*");

module.exports = {
  escapeHtml,
  capitalize,
  formatMarkdown
};
