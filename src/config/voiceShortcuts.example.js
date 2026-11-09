/**
 * voiceShortcuts.example.js
 *
 * Example voice shortcuts: say a trigger phrase while dictating and the
 * saved text is typed instead.
 *
 * How to use it:
 * 1. Copy this file to voiceShortcuts.local.js (same folder).
 * 2. Put your real email, phone and name in the local file.
 *
 * The local file is listed in .gitignore, so it is never uploaded to GitHub.
 * This example file only has fake values and is safe to commit.
 * If the local file is missing, the app simply has no shortcuts.
 *
 * Format: each shortcut has
 *   say:   the phrases you can say (any case; English and Spanish both fine)
 *   write: the text that replaces the phrase
 */

const VOICE_SHORTCUTS = [
  // Email
  {
    say: ["insert my email", "insert my e-mail", "insertar mi correo", "insertar mi correo electrónico"],
    write: "name@example.com",
  },

  // Phone number
  {
    say: ["insert my phone number", "insert my phone", "insertar mi teléfono", "insertar mi número"],
    write: "(555) 555-0100",
  },

  // Signature
  {
    say: ["insert my signature", "insertar mi firma"],
    write: "Jane Doe",
  },
];

// Makes the list available to other files in the app.
export default VOICE_SHORTCUTS;
