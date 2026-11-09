const test = require("node:test");
const assert = require("node:assert/strict");

const load = async () => {
  const m = await import("../../src/utils/applyVoiceShortcuts.js");
  return m.applyVoiceShortcuts;
};

// Fake shortcut data, passed in directly (never the real private file).
const SHORTCUTS = [
  {
    say: ["insert my email", "insert my e-mail", "insertar mi correo", "insertar mi correo electrónico"],
    write: "name@example.com",
  },
  {
    say: ["insert my phone number", "insert my phone", "insertar mi teléfono", "insertar mi número"],
    write: "(555) 555-0100",
  },
  { say: ["insert my signature", "insertar mi firma"], write: "Jane Doe" },
];

const cases = [
  // The trigger alone, with or without ending punctuation -> only the saved text
  ["insert my email", "name@example.com"],
  ["Insert my email.", "name@example.com"],
  ["insert my e-mail!", "name@example.com"],
  // Longer phrase wins ("phone number" over "phone")
  ["Insert my phone number.", "(555) 555-0100"],
  // Inside a sentence -> only the phrase is replaced, punctuation kept
  ["Send it to insert my email, thanks.", "Send it to name@example.com, thanks."],
  ["Call me at insert my phone number.", "Call me at (555) 555-0100."],
  ["Best, insert my signature", "Best, Jane Doe"],
  // Spanish triggers
  ["Insertar mi correo electrónico.", "name@example.com"],
  ["Mi número es insertar mi teléfono.", "Mi número es (555) 555-0100."],
  ["Saludos, insertar mi firma", "Saludos, Jane Doe"],
  // Mixed case
  ["INSERT MY Signature", "Jane Doe"],
  ["Please email iNsErT mY eMaIl today.", "Please email name@example.com today."],
  // No trigger -> unchanged
  ["I will send my email later.", "I will send my email later."],
  ["insert my emails", "insert my emails"],
];

for (const [input, expected] of cases) {
  test(`applyVoiceShortcuts: "${input}"`, async () => {
    const applyVoiceShortcuts = await load();
    assert.equal(applyVoiceShortcuts(input, SHORTCUTS), expected);
  });
}

test("applyVoiceShortcuts leaves text alone with an empty list", async () => {
  const applyVoiceShortcuts = await load();
  assert.equal(applyVoiceShortcuts("insert my email", []), "insert my email");
});
