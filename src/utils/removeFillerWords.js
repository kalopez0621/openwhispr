/**
 * removeFillerWords.js
 *
 * Removes filler sounds ("um", "uh", ...) and accidental repeated words
 * ("or or") from dictated text, then tidies up the spacing, commas and
 * capital letters that are left behind.
 *
 * Examples:
 *   "Um, I want the report by Friday."  -> "I want the report by Friday."
 *   "Okay, um, I have it up and running." -> "Okay, I have it up and running."
 *   "with TriMerge or or Cornelius."     -> "with TriMerge or Cornelius."
 *
 * Words that are sometimes real words (like, so, you know, I mean, este,
 * pues, o sea) are never removed.
 */

// "No letter, number or apostrophe right before / after", so we only match whole words.
// (Plain \b does not understand accented letters like the "ó" in "reunión".)
const WORD_CHAR = "[\\p{L}\\p{N}'’]";
const START = "(?<!" + WORD_CHAR + ")";
const END = "(?!" + WORD_CHAR + ")";

// Filler sounds to remove (English and Spanish speakers both use these).
const FILLERS = ["umm", "um", "uhh", "uh", "erm", "ehm", "eh", "hmm", "mm"];

// A filler, with the comma in front of it and the comma or period after it.
//   group 1: a comma right before the filler (", um")
//   group 2: punctuation right after the filler ("um," or "um.")
const FILLER_PATTERN = new RegExp(
  "(,)?\\s*" + START + "(?:" + FILLERS.join("|") + ")" + END + "(\\s*[,.!?])?",
  "giu"
);

// Small joining words. A comma between one of these and a filler only existed
// because of the pause ("and, uh, the report"), so it is removed too.
// After other words the comma is kept ("Okay, um, I" -> "Okay, I").
const JOINING_WORDS = new Set([
  "and", "but", "or", "nor", "so", "because", "the", "a", "an", "to", "of",
  "for", "with", "in", "on", "at", "is", "was", "are", "were", "if", "then",
  "y", "o", "pero", "que", "el", "la", "los", "las", "de", "con", "en", "por",
  "para", "un", "una",
]);

// Invisible marker left where a filler started the text or a sentence, so the
// next word can be capitalized. Removed again before the text is returned.
const SENTENCE_START_MARK = "\u0001";

// Short words people stutter on ("or or", "the the"). Only repeats of these
// are collapsed. Every other repeat is left alone, because it is often on
// purpose ("very very good", "no no no", "had had", "that that") or part of
// a number ("five five five" in a phone number).
const STUTTER_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "i", "to", "of", "in", "on", "is", "it",
  "we", "my", "y", "el", "la", "de", "que", "en", "con",
]);

// A word followed by one or more copies of itself ("or or", "the the the").
// Only words in STUTTER_WORDS are actually collapsed (see removeRepeats).
// \1 means "the same word again"; the i flag also catches "The the".
const REPEAT_PATTERN = new RegExp(
  START + "(" + WORD_CHAR + "+)(?:\\s+\\1" + END + ")+",
  "giu"
);

/**
 * Step 1: remove filler words and the punctuation that belongs to them.
 */
function removeFillers(text) {
  return text.replace(FILLER_PATTERN, (match, commaBefore, punctAfter, offset, whole) => {
    const before = whole.slice(0, offset);
    // The filler starts a sentence when only nothing or ". ! ?" comes before it.
    const startsSentence = !commaBefore && /(^|[.!?])\s*$/.test(before);
    const after = punctAfter ? punctAfter.trim() : "";

    // The filler ends with . ! or ?
    if (after && after !== ",") {
      // "Um." on its own: drop it completely.
      if (startsSentence) return " " + SENTENCE_START_MARK;
      // "it works, um." -> "it works." (keep the sentence's own ending)
      return after;
    }

    // The filler starts a sentence: drop it and mark the next word for a capital.
    if (startsSentence) return " " + SENTENCE_START_MARK;

    // A comma came before the filler: keep it, unless the word before it is a
    // small joining word ("and, uh, the" -> "and the").
    if (commaBefore) {
      const previousWord = (before.match(/([\p{L}\p{N}'’]+)\s*$/u) || [])[1] || "";
      return JOINING_WORDS.has(previousWord.toLowerCase()) ? " " : ", ";
    }

    return " ";
  });
}

/**
 * Step 2: collapse a short stutter word said twice in a row ("or or" -> "or").
 * Repeats of any other word are kept exactly as they were.
 */
function removeRepeats(text) {
  return text.replace(REPEAT_PATTERN, (match, word) =>
    STUTTER_WORDS.has(word.toLowerCase()) ? word : match
  );
}

/**
 * Step 3: tidy up what the removals left behind.
 */
function cleanUp(text) {
  return (
    text
      // Capitalize the word after a filler removed from the start of the text or
      // of a sentence. This is the ONLY capitalizing done: text where no filler
      // was removed at a sentence start keeps its case ("original dictation").
      .replace(
        new RegExp(SENTENCE_START_MARK + "([\\s," + SENTENCE_START_MARK + "]*)(\\p{Ll})", "gu"),
        (match, gap, letter) => gap + letter.toUpperCase()
      )
      // Remove the markers that are left.
      .split(SENTENCE_START_MARK)
      .join("")
      // No space before punctuation: "it ," -> "it,"
      .replace(/\s+([,.;:!?])/g, "$1")
      // A comma right before a sentence ending: "it,." -> "it."
      .replace(/,+([.!?])/g, "$1")
      // Two commas in a row: ",," -> ","
      .replace(/,{2,}/g, ",")
      // No double spaces.
      .replace(/[ \t]{2,}/g, " ")
      // No leftover comma or period at the very start.
      .replace(/^[\s,.;:]+/, "")
      .trim()
  );
}

/**
 * Removes filler words and repeated words, then cleans up the text.
 * Returns "" when nothing but fillers was said.
 */
export function removeFillerWords(text) {
  // If there is no text, there is nothing to clean.
  if (typeof text !== "string" || !text) return text;

  const cleaned = cleanUp(removeRepeats(removeFillers(text)));

  // Only punctuation left (e.g. "Um." -> ".") counts as nothing left.
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : "";
}

export default removeFillerWords;
