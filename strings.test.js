const strings = require("./strings");

test("should escape special HTML characters", () => {
  expect(
    strings.escapeHtml(`>>> Ben & Nuts sont "fous" l'un de l'autre <3`)
  ).toBe(
    "&gt;&gt;&gt; Ben &amp; Nuts sont &quot;fous&quot; l&#039;un de l&#039;autre &lt;3"
  );
});

test("should capitalize speaker name", () => {
  expect(strings.capitalize("john doe")).toBe("John Doe");
  expect(strings.capitalize("JANE DOE")).toBe("Jane Doe");
  expect(strings.capitalize("jOHn DOe")).toBe("John Doe");
  expect(strings.capitalize("Jane-john doe")).toBe("Jane-John Doe");
});

test("should join speakers name", () => {
  expect(strings.replaceLast("john doe", ",", " et ")).toBe("john doe");
  expect(strings.replaceLast("john,doe", ",", " et ")).toBe("john et doe");
  expect(strings.replaceLast("john_mary_doe", "_", " et ")).toBe("john_mary et doe");
});
