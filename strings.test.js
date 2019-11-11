const strings = require("./strings");

test("should escape special HTML characters", () => {
  expect(
    strings.escapeHtml(`>>> Ben & Nuts sont "fous" l'un de l'autre <3`)
  ).toBe(">>> Ben & Nuts sont \"fous\" l'un de l'autre <3");
});

test("should capitalize speaker name", () => {
  expect(strings.capitalize("john doe")).toBe("John Doe");
  expect(strings.capitalize("JANE DOE")).toBe("Jane Doe");
  expect(strings.capitalize("jOHn DOe")).toBe("John Doe");
  expect(strings.capitalize("Jane-john doe")).toBe("Jane-John Doe");
});

test("should convert markdown format", () => {
  expect(strings.formatMarkdown("Some **bold** text here")).toBe(
    "Some *bold* text here"
  );
  expect(strings.formatMarkdown("Some _italic_ text here")).toBe(
    "Some _italic_ text here"
  );
  expect(strings.formatMarkdown("Some **_bold and italic_** text here")).toBe(
    "Some *_bold and italic_* text here"
  );
  expect(strings.formatMarkdown("Some _**italic and bold**_ text here")).toBe(
    "Some _*italic and bold*_ text here"
  );
});
