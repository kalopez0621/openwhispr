/**
 * applyWordFixes.js
 *
 * Replaces words the speech model got wrong with the right spelling,
 * using the list in src/config/voiceWordFixes.js.
 *
 * Example: "I met with try merge" becomes "I met with TriMerge".
 */

// Brings in your personal word list.
import VOICE_WORD_FIXES from "../config/voiceWordFixes";

/**
 * Some characters (like . or ?) have special meaning in search patterns.
 * This adds a backslash in front of them so they are treated as normal text.
 */
function escapeForSearch(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Applies every fix in the list to the text and returns the result.
 *
 * Rules it follows:
 * - Ignores upper and lower case ("Try Merge" and "try merge" both match).
 * - Allows a space OR a hyphen between words ("go-high-level" matches too).
 * - Only matches whole words, so "try merged" is left alone.
 * - Checks longer phrases first, so a short fix never breaks a longer one.
 */
export function applyWordFixes(text, fixes = VOICE_WORD_FIXES) {
  // If there is no text, there is nothing to fix.
  if (typeof text !== "string" || !text) return text;

  // Sort a copy of the list so the longest "heard" phrases are checked first.
  const sortedFixes = [...fixes].sort((a, b) => b.heard.length - a.heard.length);

  let fixedText = text;

  for (const fix of sortedFixes) {
    // Skip any line in the list that is missing a value.
    if (!fix || !fix.heard || !fix.write) continue;

    // Split the phrase into words, e.g. "go high level" -> ["go", "high", "level"].
    const words = fix.heard.trim().split(/\s+/).map(escapeForSearch);

    // Build the search pattern:
    // - (?<![\p{L}\p{N}])  no letter or number right before the match
    // - [\s-]+             one or more spaces or hyphens between words
    // - (?![\p{L}\p{N}])   no letter or number right after the match
    // Flags: g = all matches, i = ignore case, u = handle accented letters (for Spanish later)
    const pattern = new RegExp(
      "(?<![\\p{L}\\p{N}])" + words.join("[\\s-]+") + "(?![\\p{L}\\p{N}])",
      "giu"
    );

    // Swap every match for the correct spelling.
    fixedText = fixedText.replace(pattern, fix.write);
  }

  return fixedText;
}

export default applyWordFixes;