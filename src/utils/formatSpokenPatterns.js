/**
 * formatSpokenPatterns.js
 *
 * Turns things people say out loud into the way they are normally written:
 * phone numbers, emails, websites, times and years (English and Spanish).
 *
 * Examples:
 *   "call three oh five five five five zero one four two" -> "call 305-555-0142"
 *   "send it to karla at gmail dot com"                   -> "send it to karla@gmail.com"
 *   "go to openforlaunch dot com"                         -> "go to openforlaunch.com"
 *   "at three thirty PM"                                  -> "at 3:30 PM"
 *   "due November 25th. twenty twenty six"                -> "due November 25th, 2026"
 *
 * The rule everywhere: only change text when the pattern clearly matches.
 * If anything looks off, the text is left exactly as it was.
 */

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

// "No letter or number right before / right after", so we only match whole words.
// (Plain \b does not understand accented letters like the "ó" in "reunión".)
const START = "(?<![\\p{L}\\p{N}])";
const END = "(?![\\p{L}\\p{N}])";

// Spoken digits (English and Spanish) and the digit each one stands for.
// "oh" counts as 0, as in "three oh five".
const DIGIT_WORDS = {
  zero: "0",
  oh: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  cero: "0",
  uno: "1",
  dos: "2",
  tres: "3",
  cuatro: "4",
  cinco: "5",
  seis: "6",
  siete: "7",
  ocho: "8",
  nueve: "9",
};

// English number words used for times and years, with their values.
const NUMBER_WORDS = {
  oh: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

// Word groups, each wrapped so it only matches a whole word.
const ONES = "(?:one|two|three|four|five|six|seven|eight|nine)" + END;
const TEENS =
  "(?:ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)" + END;
const ALL_TENS = "(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)" + END;
const MINUTE_TENS = "(?:twenty|thirty|forty|fifty)" + END;
const HOURS = "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)" + END;

// Space or hyphen between number words ("twenty six" or "twenty-six").
const GAP = "[\\s-]+";

// Adds up number words: "forty five" -> 45, "oh five" -> 5.
function wordsToNumber(words) {
  return words
    .toLowerCase()
    .split(/[\s-]+/)
    .filter((word) => word && word !== "and")
    .reduce((total, word) => total + (NUMBER_WORDS[word] ?? 0), 0);
}

// Web endings we recognize. Longest first so "com" is tried before "co".
const DOMAIN_ENDINGS = ["com", "net", "org", "gov", "edu", "app", "io", "ai", "co", "us"];
const ENDING = "(?:" + DOMAIN_ENDINGS.join("|") + ")" + END;

// A spoken dot: " dot " (English) or " punto " (Spanish).
const SPOKEN_DOT = "\\s+(?:dot|punto)\\s+";
// Either a spoken dot or a dot that is already typed ("gmail.com").
const ANY_DOT = "(?:\\.|" + SPOKEN_DOT + ")";
// One piece of a web address, like "gmail" or "open-whispr".
const LABEL = "[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]*[\\p{L}\\p{N}])?";
// A full domain: one or more pieces joined by dots, ending in a known ending.
const DOMAIN = LABEL + "(?:" + ANY_DOT + LABEL + ")*?" + ANY_DOT + ENDING;

// Turns spoken dots into real dots, removes spaces and lowercases.
function cleanAddress(text) {
  return text
    .replace(new RegExp(SPOKEN_DOT, "giu"), ".")
    .replace(/\s+/g, "")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// 1. Phone numbers: exactly 10 digits in a row -> 305-555-0142
// ---------------------------------------------------------------------------

// One digit token: a spoken digit word or written digits.
const DIGIT_TOKEN = "(?:" + Object.keys(DIGIT_WORDS).join("|") + "|\\d+)";
// Spaces, commas, dashes and periods allowed between digits.
const DIGIT_SEPARATOR = "[\\s,.\\-]+";
// A run of digit tokens, as long as it goes.
const PHONE_RUN = new RegExp(
  START + DIGIT_TOKEN + "(?:" + DIGIT_SEPARATOR + DIGIT_TOKEN + ")*" + END,
  "giu"
);

function formatPhoneNumbers(text) {
  return text.replace(PHONE_RUN, (run) => {
    // Turn every token into its digits and glue them together.
    const digits = run
      .split(/[\s,.\-]+/)
      .map((token) => DIGIT_WORDS[token.toLowerCase()] ?? token)
      .join("");

    // Not exactly 10 digits (e.g. "two dogs") -> leave the words alone.
    if (!/^\d{10}$/.test(digits)) return run;

    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  });
}

// ---------------------------------------------------------------------------
// 2. Emails: "karla at gmail dot com" -> karla@gmail.com
// ---------------------------------------------------------------------------

// The part before the @. It may itself contain dots ("karla dot lopez").
const NAME_PART = "[\\p{L}\\p{N}_%+-]+";
const NAME = NAME_PART + "(?:" + ANY_DOT + NAME_PART + ")*";

// name + "at"/"arroba" + domain. The name must not be glued to other text.
const EMAIL = new RegExp(
  "(?<![\\p{L}\\p{N}@.'’_%+-])(" + NAME + ")\\s+(?:at|arroba)\\s+(" + DOMAIN + ")",
  "giu"
);

// Everyday words that come before "at" in normal sentences ("look at google dot com").
// They are never treated as the name part of an email; the website step still
// fixes the domain ("look at google.com").
const NOT_EMAIL_NAMES = new Set([
  "look", "looking", "looked", "me", "us", "him", "her", "them", "it", "is", "are",
  "was", "were", "be", "am", "here", "there", "back", "stay", "arrive", "arrived",
  "meet", "available", "find", "found", "see", "check", "visit", "reach", "contact",
  "online", "posted", "listed", "work", "works", "working",
]);

function formatEmails(text) {
  return text.replace(EMAIL, (match, name, domain) => {
    if (NOT_EMAIL_NAMES.has(name.toLowerCase())) return match;
    return `${cleanAddress(name)}@${cleanAddress(domain)}`;
  });
}

// ---------------------------------------------------------------------------
// 3. Websites: "openforlaunch dot com" -> openforlaunch.com
// ---------------------------------------------------------------------------

// Only spoken dots count here, so text that is already right ("SAM.gov") is never touched.
// "www dot google dot com" works too: "www" is just the first piece.
// Small words like "a" or "the" never start a website ("a dot com bubble").
const WEBSITE = new RegExp(
  "(?<![\\p{L}\\p{N}@.])(?!(?:a|an|the|el|la|los|las|un|una)\\s)" +
    LABEL +
    "(?:" + SPOKEN_DOT + LABEL + ")*?" +
    SPOKEN_DOT +
    ENDING,
  "giu"
);

function formatWebsites(text) {
  return text.replace(WEBSITE, (match) => cleanAddress(match));
}

// ---------------------------------------------------------------------------
// 4. Times (English only): "three thirty PM" -> 3:30 PM
// ---------------------------------------------------------------------------

// Minutes: "oh five", "fifteen", "thirty", "forty five" / "forty-five".
const MINUTES =
  "(?:oh" + GAP + ONES + "|" + TEENS + "|" + MINUTE_TENS + "(?:" + GAP + ONES + ")?)";
// AM / PM in any form: AM, am, a.m., a.m, A M.
const AM_PM = "([ap])\\.?\\s?m" + END + "(\\.)?";

const TIME = new RegExp(
  START + "(" + HOURS + ")(?:" + GAP + "(" + MINUTES + "))?\\s+" + AM_PM,
  "giu"
);

function formatTimes(text) {
  return text.replace(TIME, (match, hour, minutes, ampm, trailingDot, offset, whole) => {
    const h = wordsToNumber(hour);
    const time = minutes
      ? `${h}:${String(wordsToNumber(minutes)).padStart(2, "0")}`
      : `${h}`;
    let result = `${time} ${ampm.toUpperCase()}M`;

    // "p.m." may also have been the end of the sentence. Keep that period when the
    // text ends here or a new sentence (capital letter) starts right after.
    if (trailingDot) {
      const after = whole.slice(offset + match.length);
      if (after.trim() === "" || /^\s+\p{Lu}/u.test(after)) result += ".";
    }
    return result;
  });
}

// ---------------------------------------------------------------------------
// 5. Years: "twenty twenty six" / "two thousand twenty six" -> 2026
// ---------------------------------------------------------------------------

// A number from 10 to 99 in words ("ten", "twenty six", "thirty").
const TEN_TO_99 = "(?:" + ALL_TENS + "(?:" + GAP + ONES + ")?|" + TEENS + ")";
// A number from 1 to 99 in words.
const ONE_TO_99 = "(?:" + TEN_TO_99 + "|" + ONES + ")";

// "twenty" + 10..99. "twenty five" does not match because five is below ten.
const TWENTY_YEAR = new RegExp(START + "twenty" + GAP + "(" + TEN_TO_99 + ")", "giu");
// "two thousand" + optional "and" + 1..99. Plain "two thousand" is left alone.
const TWO_THOUSAND_YEAR = new RegExp(
  START + "two" + GAP + "thousand(?:" + GAP + "and)?" + GAP + "(" + ONE_TO_99 + ")",
  "giu"
);

// "November 25th. 2026" -> "November 25th, 2026"
const MONTHS =
  "(?:january|february|march|april|may|june|july|august|september|october|november|december)";
const STRAY_PERIOD_BEFORE_YEAR = new RegExp(
  START + "(" + MONTHS + "\\s+\\d{1,2}(?:st|nd|rd|th)?)\\s*\\.\\s+(\\d{4})(?!\\d)",
  "giu"
);

function formatYears(text) {
  return text
    .replace(TWENTY_YEAR, (match, rest) => String(2000 + wordsToNumber(rest)))
    .replace(TWO_THOUSAND_YEAR, (match, rest) => String(2000 + wordsToNumber(rest)))
    .replace(STRAY_PERIOD_BEFORE_YEAR, "$1, $2");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Runs every formatter on the text and returns the result.
 *
 * Order matters:
 * - Emails before websites, so "karla at gmail dot com" becomes one email
 *   instead of "karla at gmail.com".
 * - Phone numbers before times and years, which also use number words.
 * - Times before years, so "three twenty PM" stays a time.
 */
export function formatSpokenPatterns(text) {
  // If there is no text, there is nothing to format.
  if (typeof text !== "string" || !text) return text;

  let formatted = text;
  formatted = formatEmails(formatted);
  formatted = formatWebsites(formatted);
  formatted = formatPhoneNumbers(formatted);
  formatted = formatTimes(formatted);
  formatted = formatYears(formatted);
  return formatted;
}

export default formatSpokenPatterns;
