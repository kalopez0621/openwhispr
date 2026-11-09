const test = require("node:test");
const assert = require("node:assert/strict");

const load = async () => {
  const m = await import("../../src/utils/formatSpokenPatterns.js");
  return m.formatSpokenPatterns;
};

const cases = [
  // Phone numbers
  ["call three oh five five five five zero one four two", "call 305-555-0142"],
  ["call 305 five five five, 0142", "call 305-555-0142"],
  ["llama al tres cero cinco cinco cinco cinco cero uno cuatro dos", "llama al 305-555-0142"],
  // Emails
  ["send it to karla at gmail dot com", "send it to karla@gmail.com"],
  ["send it to karla at gmail.com", "send it to karla@gmail.com"],
  ["escríbele a Karla arroba gmail punto com", "escríbele a karla@gmail.com"],
  // Websites
  ["go to openforlaunch dot com", "go to openforlaunch.com"],
  ["go to www dot openforlaunch dot com", "go to www.openforlaunch.com"],
  ["visita openforlaunch punto com", "visita openforlaunch.com"],
  ["check SAM.gov today", "check SAM.gov today"],
  // Times
  ["at three thirty PM", "at 3:30 PM"],
  ["at ten fifteen a.m. tomorrow", "at 10:15 AM tomorrow"],
  ["at three p.m.", "at 3 PM."],
  ["at nine oh five A M", "at 9:05 AM"],
  // Years
  ["due November 25th. twenty twenty six", "due November 25th, 2026"],
  ["back in twenty thirty", "back in 2030"],
  ["since two thousand twenty six", "since 2026"],
  // Must not change
  ["meet me at the office", "meet me at the office"],
  ["I have two dogs and three cats", "I have two dogs and three cats"],
  ["twenty five people came", "twenty five people came"],
  ["la reunión es a las diez de la mañana", "la reunión es a las diez de la mañana"],
];

for (const [input, expected] of cases) {
  test(`formatSpokenPatterns: "${input}"`, async () => {
    const formatSpokenPatterns = await load();
    assert.equal(formatSpokenPatterns(input), expected);
  });
}

test("formatSpokenPatterns returns empty or non-string input unchanged", async () => {
  const formatSpokenPatterns = await load();
  assert.equal(formatSpokenPatterns(""), "");
  assert.equal(formatSpokenPatterns(undefined), undefined);
});
