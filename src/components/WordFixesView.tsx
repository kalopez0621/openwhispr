/**
 * WordFixesView.tsx
 *
 * Voice: the "Word Fixes" tab on the Dictionary page.
 *
 * Shows every word fix Voice applies after transcription:
 * 1. Fixes added in the app (Home history > Edit > "Add fix", or the form here).
 *    These can be added and deleted from this screen.
 * 2. Built-in fixes from src/config/voiceWordFixes.js. Read-only here,
 *    because they live in a code file.
 *
 * Text is English only for now and kept out of translation.json on purpose.
 */
import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "./icons";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PAGE_CONTENT_WIDTH_CLASS } from "./ui/pageWidth";
import { cn } from "./lib/utils";
import { CARD_SURFACE_CLASS } from "./ui/surfaces";
import VOICE_WORD_FIXES from "../config/voiceWordFixes";
import {
  addUserWordFix,
  getUserWordFixes,
  isCommonPhrase,
  removeUserWordFix,
} from "../utils/userWordFixes";

// One fix as shown on screen.
type WordFix = { heard: string; write: string; addedAt?: string };

// All the words on this screen, in one place so they are easy to change.
const LABELS = {
  intro:
    "Word fixes change words the speech model gets wrong, right after you dictate. " +
    "Fixes you add here or from Home (Edit > Add fix) work on your next dictation.",
  search: "Search fixes...",
  addTitle: "Add a fix",
  heardPlaceholder: "What it writes (e.g. versal)",
  writePlaceholder: "What it should be (e.g. Vercel)",
  add: "Add",
  commonWarning:
    "This is a normal phrase. Adding it will change it everywhere, even when you mean it.",
  yourFixes: "Your fixes",
  yourFixesEmpty: 'No fixes yet. Edit a dictation on Home and click "Add fix", or add one above.',
  builtIn: "Built-in fixes",
  builtInNote:
    "These live in the code file src/config/voiceWordFixes.js and can't be deleted here.",
  show: "Show",
  hide: "Hide",
  delete: "Delete fix",
  noMatches: "No fixes match your search.",
};

/**
 * One row: "heard" crossed out, an arrow, then the correct word.
 * Shows a delete button only when onDelete is given.
 */
function FixRow({ fix, onDelete }: { fix: WordFix; onDelete?: () => void }) {
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1 text-sm text-foreground">
        <span className="line-through opacity-60">{fix.heard}</span>
        <span className="mx-2 text-muted-foreground">→</span>
        <span className="font-medium">{fix.write}</span>
      </span>
      {onDelete && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          aria-label={LABELS.delete}
          title={LABELS.delete}
          className="h-7 w-7 rounded-full text-muted-foreground/70 hover:text-destructive"
        >
          <X size={13} />
        </Button>
      )}
    </div>
  );
}

export default function WordFixesView() {
  // Fixes added in the app, read from local storage.
  const [userFixes, setUserFixes] = useState<WordFix[]>(() => getUserWordFixes());
  // Search box text.
  const [query, setQuery] = useState("");
  // The "Add a fix" form.
  const [heard, setHeard] = useState("");
  const [write, setWrite] = useState("");
  // Built-in list starts collapsed because it is long.
  const [showBuiltIn, setShowBuiltIn] = useState(false);

  // Re-read the list when another Voice window changes it, or when this
  // window gets focus again (for example after adding a fix from Home).
  useEffect(() => {
    const refresh = () => setUserFixes(getUserWordFixes());
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Keeps only fixes whose "heard" or "write" contains the search text.
  const matches = (fix: WordFix) => {
    const q = query.trim().toLowerCase();
    return !q || fix.heard.toLowerCase().includes(q) || fix.write.toLowerCase().includes(q);
  };

  // Newest first, so a fix you just added is at the top.
  const shownUserFixes = useMemo(
    () => [...userFixes].reverse().filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userFixes, query]
  );
  // Built-in fixes sorted A to Z by what the model writes.
  const shownBuiltIn = useMemo(
    () =>
      [...(VOICE_WORD_FIXES as WordFix[])]
        .sort((a, b) => a.heard.localeCompare(b.heard))
        .filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query]
  );

  // Saves the form as a new fix, then clears it.
  const handleAdd = () => {
    if (addUserWordFix(heard, write)) {
      setUserFixes(getUserWordFixes());
      setHeard("");
      setWrite("");
    }
  };

  // Deletes one fix you added.
  const handleDelete = (fix: WordFix) => {
    removeUserWordFix(fix.heard);
    setUserFixes(getUserWordFixes());
  };

  const canAdd = heard.trim() !== "" && write.trim() !== "" && heard.trim() !== write.trim();
  // Searching opens the built-in list so matches there are visible.
  const builtInOpen = showBuiltIn || query.trim() !== "";

  return (
    <div className={cn(PAGE_CONTENT_WIDTH_CLASS, "flex flex-col gap-4 px-6 py-5")}>
      <p className="text-sm text-muted-foreground">{LABELS.intro}</p>

      {/* Add a fix */}
      <div className={cn(CARD_SURFACE_CLASS, "space-y-2 p-4")}>
        <p className="text-sm font-medium text-foreground">{LABELS.addTitle}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={heard}
            onChange={(event) => setHeard(event.target.value)}
            placeholder={LABELS.heardPlaceholder}
            className="min-w-40 flex-1"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            value={write}
            onChange={(event) => setWrite(event.target.value)}
            onKeyDown={(event) => {
              // Enter in the second box adds the fix.
              if (event.key === "Enter" && canAdd) handleAdd();
            }}
            placeholder={LABELS.writePlaceholder}
            className="min-w-40 flex-1"
          />
          <Button size="sm" onClick={handleAdd} disabled={!canAdd}>
            <Plus size={14} className="me-1" />
            {LABELS.add}
          </Button>
        </div>
        {heard.trim() && isCommonPhrase(heard) && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{LABELS.commonWarning}</p>
        )}
      </div>

      {/* Search */}
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={LABELS.search}
      />

      {/* Your fixes */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {LABELS.yourFixes} ({userFixes.length})
        </p>
        <div className={cn(CARD_SURFACE_CLASS, "divide-y divide-border/60")}>
          {userFixes.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{LABELS.yourFixesEmpty}</p>
          ) : shownUserFixes.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{LABELS.noMatches}</p>
          ) : (
            shownUserFixes.map((fix) => (
              <FixRow key={fix.heard} fix={fix} onDelete={() => handleDelete(fix)} />
            ))
          )}
        </div>
      </div>

      {/* Built-in fixes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            {LABELS.builtIn} ({VOICE_WORD_FIXES.length})
          </p>
          <Button size="sm" variant="ghost" onClick={() => setShowBuiltIn((open) => !open)}>
            {builtInOpen ? LABELS.hide : LABELS.show}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{LABELS.builtInNote}</p>
        {builtInOpen && (
          <div className={cn(CARD_SURFACE_CLASS, "divide-y divide-border/60")}>
            {shownBuiltIn.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">{LABELS.noMatches}</p>
            ) : (
              shownBuiltIn.map((fix) => <FixRow key={`${fix.heard}-${fix.write}`} fix={fix} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
