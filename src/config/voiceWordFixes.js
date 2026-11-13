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
  { heard: "tri merch", write: "TriMerge" },
  { heard: "three merch", write: "TriMerge" },

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

  // Ollama
  { heard: "oh llama", write: "Ollama" },
  { heard: "O Lama", write: "Ollama" },

  // Added Nov 9, 2026: Teams (phrases only, because "teens" is a real word)
  { heard: "Microsoft Teens", write: "Microsoft Teams" },
  { heard: "Teens meeting", write: "Teams meeting" },
  { heard: "Teens call", write: "Teams call" },

  // Added Nov 9, 2026 from dictation testing
  { heard: "Sam Dot gov", write: "SAM.gov" },
  { heard: "Sam dog", write: "SAM.gov" },
  { heard: "clawed code", write: "Claude Code" },
  { heard: "clot code", write: "Claude Code" },
  { heard: "cloth coat", write: "Claude Code" },
  { heard: "cloud code", write: "Claude Code" },
  { heard: "Olama", write: "Ollama" },
  { heard: "Streamlet", write: "Streamlit" },
  { heard: "Sam.gov", write: "SAM.gov" },
  { heard: "Sam Dotgov", write: "SAM.gov" },
  { heard: "Sam dot gov", write: "SAM.gov" },
  { heard: "TriMech", write: "TriMerge" },
  { heard: "Navada", write: "Navodda" },
  { heard: "SamDotgov", write: "SAM.gov" },
  { heard: "openforlunch", write: "openforlaunch" },
  { heard: "Carla", write: "Karla" },

  // Added Nov 13, 2026 from the history review (383 dictations) and Karla's Word list

  // People
  { heard: "Jerry", write: "Gerri" },
  { heard: "Janine", write: "Jeanine" },
  { heard: "Cornelis", write: "Cornelius" },
  { heard: "Novoda", write: "Navodda" },
  { heard: "Novata", write: "Navodda" },
  // Ms. Rabi-Menendez (the model has written Robbie, Rabbi, Ravi and "R by")
  { heard: "Robbie Menendez", write: "Rabi-Menendez" },
  { heard: "Rabbi Menendez", write: "Rabi-Menendez" },
  { heard: "Ravi Menendez", write: "Rabi-Menendez" },
  { heard: "R by Menendez", write: "Rabi-Menendez" },
  { heard: "Rabi Menendez", write: "Rabi-Menendez" },
  { heard: "Ms. Robbie", write: "Ms. Rabi-Menendez" },
  { heard: "Miss Robbie", write: "Ms. Rabi-Menendez" },
  { heard: "Ms. Ravi", write: "Ms. Rabi-Menendez" },
  { heard: "Miss Ravi", write: "Ms. Rabi-Menendez" },
  { heard: "Ms. Rabbi", write: "Ms. Rabi-Menendez" },

  // Companies and organizations
  { heard: "Moella", write: "Mohela" },
  { heard: "Moela", write: "Mohela" },
  { heard: "Miami Day College", write: "Miami Dade College" },
  { heard: "Riff Link", write: "Rippling" },

  // Tech words
  { heard: "Supervase", write: "Supabase" },
  { heard: "Next dot J S", write: "Next.js" },
  { heard: "Next dot JS", write: "Next.js" },
  { heard: "versal", write: "Vercel" },
  { heard: "Varsella", write: "Vercel" },
  { heard: "Burcell", write: "Vercel" },
  { heard: "Vercells", write: "Vercel" },
  { heard: "Callab", write: "Colab" },
  { heard: "Google collab", write: "Google Colab" },
  { heard: "Google Cola", write: "Google Colab" },
  { heard: "Cagle", write: "Kaggle" },
  { heard: "streamly", write: "Streamlit" },
  { heard: "Quimby", write: "Qwen" },
  { heard: "plot code", write: "Claude Code" },
  { heard: "Chad GPT", write: "ChatGPT" },
  { heard: "Chai GPT", write: "ChatGPT" },
  { heard: "Whisperflow", write: "Wispr Flow" },
  { heard: "Whisper flow", write: "Wispr Flow" },
  { heard: "open whisper", write: "OpenWhispr" },
  { heard: "smart wrangler", write: "SmartWrangle" },
  { heard: "Teens chat", write: "Teams chat" },

  // Added Nov 13, 2026 from the first test run
  { heard: "Miami Bay College", write: "Miami Dade College" },
  { heard: "Brusel", write: "Vercel" },
  { heard: "Bamoela", write: "about Mohela" },

  // Everyday phrases the model mishears
  { heard: "require cement", write: "requirements" },
  { heard: "fixed acid", write: "fixed asset" },
  { heard: "capital editions", write: "capital additions" },
  { heard: "hot peas", write: "hotkeys" },
  { heard: "multiple chest", write: "multiple chats" },
  { heard: "no eye detection", write: "no AI detection" },
  { heard: "chin of emails", write: "chain of emails" },

  // NOT active on purpose: "inspire" is a normal English word.
  // Turning this on would change sentences like "you inspire me" too.
  // { heard: "inspire", write: "Enspyre" },
];

// Makes the list available to other files in the app.
export default VOICE_WORD_FIXES;