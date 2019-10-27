const strings = require("./strings");

test("should escape special HTML characters", () => {
  expect(
    strings.escapeHtml(`>>> Ben & Nuts sont "fous" l'un de l'autre <3`)
  ).toBe(
    "&gt;&gt;&gt; Ben &amp; Nuts sont &quot;fous&quot; l&#039;un de l&#039;autre &lt;3"
  );
});
