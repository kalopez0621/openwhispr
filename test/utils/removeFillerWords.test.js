const test = require("node:test");
const assert = require("node:assert/strict");

const load = async () => {
  const m = await import("../../src/utils/removeFillerWords.js");
  return m.removeFillerWords;
};

const cases = [
  // Fillers removed, with their punctuation
  ["Um, I want the report by Friday.", "I want the report by Friday."],
  ["Okay, um, I have it up and running.", "Okay, I have it up and running."],
  // No filler at the start, so the case is left as it was.
  ["and, uh, the report", "and the report"],
  ["Uh, eh, la reunión es mañana.", "La reunión es mañana."],
  // Repeated words collapsed
  ["Not only with TriMerge or or Cornelius.", "Not only with TriMerge or Cornelius."],
  // Must stay the same
  ["I know that that is true.", "I know that that is true."],
  ["She had had enough.", "She had had enough."],
  ["Este documento es nuevo.", "Este documento es nuevo."],
  ["I like it, so I bought it.", "I like it, so I bought it."],
  ["call five five five", "call five five five"],
  // Capitalization is only touched where a filler was removed.
  ["original dictation", "original dictation"],
  // Only short stutter words are collapsed; other repeats are kept.
  ["very very good", "very very good"],
  ["no no no", "no no no"],
  // Nothing left
  ["Um.", ""],
];

for (const [input, expected] of cases) {
  test(`removeFillerWords: "${input}"`, async () => {
    const removeFillerWords = await load();
    assert.equal(removeFillerWords(input), expected);
  });
}
