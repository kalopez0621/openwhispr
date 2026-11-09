/**
 * applyVoiceShortcuts.js
 *
 * Replaces a spoken trigger phrase with saved text, using the list in
 * src/config/voiceShortcuts.local.js.
 *
 * Examples (with the email shortcut):
 *   "Insert my email."                    -> "name@example.com"
 *   "Send it to insert my email, thanks." -> "Send it to name@example.com, thanks."
 */

/**
 * Loads the private shortcut list, if it exists.
 *
 * voiceShortcuts.local.js is not in git, so it may be missing (fresh clone,
 * another computer). A normal `import` would break the build in that case.
 * import.meta.glob is Vite's "import every file that matches" feature: it
 * returns an empty object when no file matches, so a missing file simply
 * means "no shortcuts". (brandFonts.ts uses the same method for optional fonts.)
 *
 * Outside Vite (e.g. plain Node tests) import.meta.glob does not exist and the
 * call throws, so the try/catch falls back to an empty list there too.
 */
function loadLocalShortcuts() {
  try {
    const modules = import.meta.glob("../config/voiceShortcuts.local.js", {
      eager: true,
      import: "default",
    });
    const list = Object.values(modules)[0];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const VOICE_SHORTCUTS = loadLocalShortcuts();

/**
 * Some characters (like . or ?) have special meaning in search patterns.
 * This adds a backslash in front of them so they are treated as normal text.
 */
function escapeForSearch(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds the search pattern for one phrase:
 * - any amount of space between the words ("insert  my email")
 * - whole phrase only: no letter or number right before or after it
 */
function phrasePattern(phrase) {
  const words = phrase.trim().split(/\s+/).map(escapeForSearch);
  return "(?<![\\p{L}\\p{N}])" + words.join("\\s+") + "(?![\\p{L}\\p{N}])";
}

/**
 * Applies every shortcut to the text and returns the result.
 *
 * Rules it follows:
 * - Ignores upper and lower case ("Insert My Email" matches).
 * - If the whole dictation is just the trigger (with or without ending
 *   punctuation), returns only the saved text, with no period added.
 * - Inside a sentence, replaces only the phrase and keeps the punctuation.
 * - Checks longer phrases first, so "insert my phone number" wins over
 *   "insert my phone".
 */
export function applyVoiceShortcuts(text, shortcuts = VOICE_SHORTCUTS) {
  // If there is no text or no shortcuts, there is nothing to do.
  if (typeof text !== "string" || !text || !Array.isArray(shortcuts) || !shortcuts.length) {
    return text;
  }

  // Flatten to one { phrase, write } pair per trigger phrase, skipping
  // incomplete entries, then sort so the longest phrases are checked first.
  const pairs = shortcuts
    .filter((shortcut) => shortcut && Array.isArray(shortcut.say) && shortcut.write)
    .flatMap((shortcut) =>
      shortcut.say
        .filter((phrase) => typeof phrase === "string" && phrase.trim())
        .map((phrase) => ({ phrase, write: shortcut.write }))
    )
    .sort((a, b) => b.phrase.length - a.phrase.length);

  // Case 1: the whole dictation is only the trigger, maybe with ending
  // punctuation ("Insert my email."). Return just the saved text.
  for (const { phrase, write } of pairs) {
    const wholeText = new RegExp("^\\s*" + phrasePattern(phrase) + "\\s*[.!?,;:]*\\s*$", "iu");
    if (wholeText.test(text)) return write;
  }

  // Case 2: the trigger is inside a sentence. Replace only the phrase.
  // A function is used as the replacement so characters like "$" in the
  // saved text are written exactly as they are.
  let result = text;
  for (const { phrase, write } of pairs) {
    const inside = new RegExp(phrasePattern(phrase), "giu");
    result = result.replace(inside, () => write);
  }
  return result;
}

export default applyVoiceShortcuts;
