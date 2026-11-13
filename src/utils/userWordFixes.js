/**
 * userWordFixes.js
 *
 * Word fixes that Karla adds from inside the app (not by editing code).
 *
 * How it works:
 * - When she edits a past dictation in the Home history and confirms
 *   "Add fix", the pair (heard -> write) is saved here.
 * - applyWordFixes.js reads this list together with the built-in list in
 *   src/config/voiceWordFixes.js, so the fix works on the very next dictation.
 *
 * Where it is stored:
 * - In the app's local browser storage (localStorage) under one key.
 *   Every Voice window shares it, it stays on this computer, and it
 *   survives restarts. Nothing is sent anywhere.
 */

// The one storage key for the list. Change it only if the format changes.
const STORAGE_KEY = "voiceUserWordFixes";

// Longest change (in words) we treat as a mishearing. Bigger edits are
// rewrites, not "it heard the wrong word", so we don't offer a fix for them.
const MAX_PHRASE_WORDS = 5;

// Common English words. If every word in a "heard" phrase is on this list,
// we warn before saving, because the fix would also change normal sentences
// (like "her cell" or "inspire"). This is a warning only, never a block.
const COMMON_WORDS = new Set(
  `a about after again all also an and any are as at be because been before
  being but by can cell come could day did do does down each even every for
  from get give go going good got had has have he her here him his how i if
  in inspire into is it its just know last let like look made make many may
  me more most much my need new no not now of off on one only or other our
  out over people put right said same say see she should so some still such
  take teens than that the their them then there these they thing think this
  those time to too two up us use very want was way we well were what when
  where which while who why will with work would year yes you your`
    .split(/\s+/)
    .filter(Boolean)
);

/**
 * Returns the browser storage object, or null when there isn't one
 * (for example inside the Node test runner).
 */
function getStorage() {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    // Some sandboxed contexts throw just for touching localStorage.
    return null;
  }
}

/**
 * Reads the saved list. Always returns an array of { heard, write } objects,
 * even if the stored value is missing or damaged.
 */
export function getUserWordFixes() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    // Keep only well-formed entries.
    return parsed.filter(
      (fix) => fix && typeof fix.heard === "string" && typeof fix.write === "string"
    );
  } catch {
    return [];
  }
}

/**
 * Saves the whole list back to storage.
 */
function saveUserWordFixes(fixes) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(fixes));
    return true;
  } catch {
    return false;
  }
}

/**
 * Adds one fix. If a fix for the same "heard" phrase already exists
 * (ignoring upper/lower case), it is replaced with the new one.
 * Returns true when it was saved.
 */
export function addUserWordFix(heard, write) {
  const cleanHeard = String(heard || "").trim();
  const cleanWrite = String(write || "").trim();
  // Nothing to save, or the two are the same.
  if (!cleanHeard || !cleanWrite || cleanHeard === cleanWrite) return false;

  const others = getUserWordFixes().filter(
    (fix) => fix.heard.toLowerCase() !== cleanHeard.toLowerCase()
  );
  others.push({ heard: cleanHeard, write: cleanWrite, addedAt: new Date().toISOString() });
  return saveUserWordFixes(others);
}

/**
 * Removes the fix for one "heard" phrase. Returns true when it was saved.
 */
export function removeUserWordFix(heard) {
  const target = String(heard || "")
    .trim()
    .toLowerCase();
  const kept = getUserWordFixes().filter((fix) => fix.heard.toLowerCase() !== target);
  return saveUserWordFixes(kept);
}

/**
 * True when every word in the phrase is a common English word,
 * meaning a fix for it could change normal sentences too.
 */
export function isCommonPhrase(phrase) {
  const words = String(phrase || "")
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}']/gu, ""))
    .filter(Boolean);
  return words.length > 0 && words.every((word) => COMMON_WORDS.has(word));
}

/**
 * Removes punctuation from the start and end of a phrase,
 * so "Vercel." becomes "Vercel" and "(versal" becomes "versal".
 */
function trimPunctuation(phrase) {
  return phrase.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

/**
 * Compares the old text with the edited text and returns the phrases that
 * changed, as [{ heard, write }]. Example:
 *   old: "I pushed it to versal today."
 *   new: "I pushed it to Vercel today."
 *   ->   [{ heard: "versal", write: "Vercel" }]
 *
 * It lines up the two texts word by word (longest common subsequence),
 * then turns each replaced stretch of words into one pair.
 * Pure additions or deletions (no "before" or no "after") are skipped,
 * and so are changes longer than MAX_PHRASE_WORDS.
 */
export function findChangedPhrases(oldText, newText) {
  const a = String(oldText || "")
    .split(/\s+/)
    .filter(Boolean);
  const b = String(newText || "")
    .split(/\s+/)
    .filter(Boolean);

  // Compare words without their outer punctuation and without case,
  // so adding a period or a capital letter alone is not a "change".
  const key = (word) => trimPunctuation(word).toLowerCase();

  // Build the LCS table: lcs[i][j] = matching words in a[i..] and b[j..].
  const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] =
        key(a[i]) === key(b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const pairs = [];
  let removed = [];
  let added = [];

  // Saves the current replaced stretch (if any) as one pair.
  const flush = () => {
    const heard = trimPunctuation(removed.join(" "));
    const write = trimPunctuation(added.join(" "));
    const isReplacement = heard && write && heard !== write;
    const isShort = removed.length <= MAX_PHRASE_WORDS && added.length <= MAX_PHRASE_WORDS;
    if (isReplacement && isShort) pairs.push({ heard, write });
    removed = [];
    added = [];
  };

  // Walk both texts along the LCS path.
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && key(a[i]) === key(b[j])) {
      // Same word in both: end of any changed stretch.
      flush();
      i++;
      j++;
    } else if (j < b.length && (i >= a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      added.push(b[j]); // word only in the edited text
      j++;
    } else {
      removed.push(a[i]); // word only in the old text
      i++;
    }
  }
  flush();

  return pairs;
}
