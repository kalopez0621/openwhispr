/**
 * voiceWordFixes.js
 *
 * Personal word fixes for Voice.
 *
 * Why this file exists:
 * The built-in custom dictionary only works with Whisper models.
 * Orukeet ignores it, so it writes "try merge" instead of "TriMerge".
 * This list fixes those words AFTER transcription, for any model.
 *
 * How to add a word:
 * Copy one line, change "heard" to what the model wrote,
 * and "write" to what you actually want.
 * Matching ignores upper and lower case, so "Try Merge" is caught too.
 */

const VOICE_WORD_FIXES = [
  // heard: what the speech model wrote   write: what it should be

  // TriMerge
  { heard: "try merge", write: "TriMerge" },
  { heard: "tri merge", write: "TriMerge" },

  // GoHighLevel
  { heard: "go high level", write: "GoHighLevel" },

  // Open for Launch (Orukeet also drops "for" or hears "lunch")
  { heard: "open for launch", write: "Open for Launch" },
  { heard: "open launch", write: "Open for Launch" },
  { heard: "open for lunch", write: "Open for Launch" },

  // Enspyre (Orukeet splits it into two words)
  { heard: "and spire", write: "Enspyre" },
  { heard: "en spire", write: "Enspyre" },
  { heard: "in spire", write: "Enspyre" },

  // NOT active on purpose: "inspire" is a normal English word.
  // Turning this on would change sentences like "you inspire me" too.
  // { heard: "inspire", write: "Enspyre" },
];

// Makes the list available to other files in the app.
export default VOICE_WORD_FIXES;