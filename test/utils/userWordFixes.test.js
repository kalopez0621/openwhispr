// Tests for src/utils/userWordFixes.js (fixes added from the Home history editor).
const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../../src/utils/userWordFixes.js");

// A tiny stand-in for the browser's localStorage, so the save/load code can run in Node.
function installFakeStorage(t) {
  const store = new Map();
  const previous = global.window;
  global.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
  };
  t.after(() => {
    global.window = previous;
  });
}

test("finds a single replaced word", async () => {
  const { findChangedPhrases } = await load();
  assert.deepEqual(
    findChangedPhrases("I pushed it to versal today.", "I pushed it to Vercel today."),
    [{ heard: "versal", write: "Vercel" }]
  );
});

test("finds a replaced phrase of different length", async () => {
  const { findChangedPhrases } = await load();
  assert.deepEqual(
    findChangedPhrases("pushed it to her cell at noon", "pushed it to Vercel at noon"),
    [{ heard: "her cell", write: "Vercel" }]
  );
});

test("ignores punctuation-only and case-only changes", async () => {
  const { findChangedPhrases } = await load();
  assert.deepEqual(findChangedPhrases("due november twenty", "Due November twenty."), []);
});

test("skips pure additions, pure deletions and long rewrites", async () => {
  const { findChangedPhrases } = await load();
  assert.deepEqual(findChangedPhrases("send the report", "send the full report"), []);
  assert.deepEqual(findChangedPhrases("send the full report", "send the report"), []);
  assert.deepEqual(
    findChangedPhrases("a b c d e f g h", "one two three four five six seven eight"),
    []
  );
});

test("finds two separate fixes in one edit", async () => {
  const { findChangedPhrases } = await load();
  assert.deepEqual(findChangedPhrases("I met Jerry about Moella.", "I met Gerri about Mohela."), [
    { heard: "Jerry", write: "Gerri" },
    { heard: "Moella", write: "Mohela" },
  ]);
});

test("flags common phrases but not unusual words", async () => {
  const { isCommonPhrase } = await load();
  assert.equal(isCommonPhrase("her cell"), true);
  assert.equal(isCommonPhrase("versal"), false);
});

test("saves, replaces and removes fixes", async (t) => {
  installFakeStorage(t);
  const { addUserWordFix, getUserWordFixes, removeUserWordFix } = await load();
  assert.equal(addUserWordFix("versal", "Vercel"), true);
  assert.equal(addUserWordFix("Versal", "Vercel app"), true); // same phrase, new answer
  const saved = getUserWordFixes();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].write, "Vercel app");
  removeUserWordFix("versal");
  assert.deepEqual(getUserWordFixes(), []);
});

test("applyWordFixes uses fixes added in the app", async (t) => {
  installFakeStorage(t);
  const { addUserWordFix } = await load();
  const { applyWordFixes } = await import("../../src/utils/applyWordFixes.js");
  addUserWordFix("zorbit", "Zorbix");
  assert.equal(applyWordFixes("I use zorbit daily."), "I use Zorbix daily.");
});
