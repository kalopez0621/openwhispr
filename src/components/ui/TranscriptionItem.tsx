import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { Tooltip } from "./tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  Copy,
  Trash2,
  FileText,
  FolderOpen,
  RotateCcw,
  Loader2,
  AlertCircle,
  ArchiveRestore,
  MoreVertical,
  Pencil,
} from "../icons";
// Voice: saves edited history text and turns edits into word fixes.
import { updateTranscription as updateInStore } from "../../stores/transcriptionStore";
import { addUserWordFix, findChangedPhrases, isCommonPhrase } from "../../utils/userWordFixes";
import type {
  TranscriptionItem as TranscriptionItemType,
  TranscriptionErrorCode,
} from "../../types/electron";
import { cn } from "../lib/utils";
import { getCachedPlatform } from "../../utils/platform";
import { formatMmSs } from "../../utils/formatDuration";

const platform = getCachedPlatform();

// Voice: text for the "Edit" and "Add this as a fix?" feature.
// English only for now. Kept here (not in translation.json) on purpose.
const EDIT_LABELS = {
  menuItem: "Edit text",
  save: "Save",
  saving: "Saving...",
  cancel: "Cancel",
  saveFailed: "Couldn't save the change. Please try again.",
  promptTitle: "Add this as a fix?",
  promptBody: "Every time Voice hears the left side, it will write the right side.",
  commonWarning:
    "This is a normal phrase. Adding it will change it everywhere, even when you mean it.",
  addFix: "Add fix",
  justOnce: "Just this once",
  added: "Fix added",
  skipped: "Only this entry was changed",
};

// Voice: one suggested fix shown after an edit, and what Karla chose for it.
type FixSuggestion = {
  heard: string;
  write: string;
  status: "pending" | "added" | "skipped";
};

const ACTION_BUTTON_CLASS =
  "h-7 w-7 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-foreground/6 dark:hover:bg-white/6";

function getShowInFolderKey(): string {
  if (platform === "win32") return "controlPanel.history.showInFolderWindows";
  if (platform === "linux") return "controlPanel.history.showInFolderLinux";
  return "controlPanel.history.showInFolder";
}

interface MenuAction {
  key: string;
  icon: typeof Copy;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

interface TranscriptionItemProps {
  item: TranscriptionItemType;
  onCopy: (text: string) => void;
  onDelete: (id: number) => void;
  onShowAudioInFolder?: (id: number) => void;
  onRetryTranscription?: (id: number, options?: { isRecover?: boolean }) => Promise<void>;
  onOpenSettings?: () => void;
}

export default function TranscriptionItem({
  item,
  onCopy,
  onDelete,
  onShowAudioInFolder,
  onRetryTranscription,
  onOpenSettings,
}: TranscriptionItemProps) {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  // Voice: edit mode for this history entry.
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Voice: fixes suggested by the last edit ("versal" -> "Vercel").
  const [suggestions, setSuggestions] = useState<FixSuggestion[]>([]);

  // Voice: opens the editor with the current text.
  const startEditing = () => {
    setDraftText(item.text);
    setSaveError(false);
    setSuggestions([]);
    setIsEditing(true);
  };

  // Voice: saves the edited text, then works out which words changed
  // and asks whether to turn each change into a permanent word fix.
  const saveEdit = async () => {
    const newText = draftText.trim();
    // Nothing changed: just close the editor.
    if (!newText || newText === item.text) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    setSaveError(false);
    try {
      // Keep the raw transcript as it was; only the final text changes.
      const result = await window.electronAPI.updateTranscriptionText(
        item.id,
        newText,
        item.raw_text ?? item.text
      );
      if (!result?.success || !result.transcription) {
        setSaveError(true);
        return;
      }
      updateInStore(result.transcription);
      setIsEditing(false);
      // Offer a fix for each replaced phrase.
      setSuggestions(
        findChangedPhrases(item.text, newText).map((pair) => ({ ...pair, status: "pending" }))
      );
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Voice: records Karla's choice for one suggestion.
  const resolveSuggestion = (index: number, addAsFix: boolean) => {
    setSuggestions((current) =>
      current.map((suggestion, i) => {
        if (i !== index) return suggestion;
        if (addAsFix && addUserWordFix(suggestion.heard, suggestion.write)) {
          return { ...suggestion, status: "added" };
        }
        return { ...suggestion, status: "skipped" };
      })
    );
  };

  const timestampSource = item.timestamp.endsWith("Z") ? item.timestamp : `${item.timestamp}Z`;
  const timestampDate = new Date(timestampSource);
  const formattedTime = Number.isNaN(timestampDate.getTime())
    ? ""
    : timestampDate.toLocaleTimeString(i18n.language, {
        hour: "2-digit",
        minute: "2-digit",
      });

  const handleRetry = async () => {
    if (isRetrying || !onRetryTranscription) return;
    setIsRetrying(true);
    try {
      await onRetryTranscription(item.id, { isRecover: item.status === "discarded" });
    } finally {
      setIsRetrying(false);
    }
  };

  const isFailed = item.status === "failed";
  const isDiscarded = item.status === "discarded";
  const isTranscribed = !isFailed && !isDiscarded;
  const discardedDuration =
    item.audio_duration_ms && item.audio_duration_ms > 0
      ? formatMmSs(Math.round(item.audio_duration_ms / 1000))
      : null;
  const rawText = item.raw_text;
  const hasAudio = item.has_audio === 1;

  const errorCode = item.error_code as TranscriptionErrorCode;
  const isConfigError =
    errorCode === "API_KEY_MISSING" ||
    errorCode === "INVALID_KEY" ||
    errorCode === "PROVIDER_AUTH_FAILED" ||
    errorCode === "PROVIDER_ACCESS_DENIED" ||
    errorCode === "PROVIDER_QUOTA_EXHAUSTED" ||
    errorCode === "PROVIDER_MODEL_NOT_FOUND" ||
    errorCode === "PROVIDER_NO_RESPONSE" ||
    errorCode === "MODEL_NOT_AVAILABLE" ||
    errorCode === "CUSTOM_ENDPOINT_INVALID";
  const isLimitError = errorCode === "LIMIT_REACHED";
  const isOfflineError = errorCode === "OFFLINE";

  const retryLabel = t(
    item.route_kind === "translation"
      ? "controlPanel.history.retryTranslationMode"
      : "controlPanel.history.retryTranscription"
  );

  // Copy stays visible as the one-tap action; everything else lives in the menu.
  const candidateActions: (MenuAction | false)[] = [
    // Voice: edit the text of a finished dictation.
    isTranscribed && {
      key: "edit",
      icon: Pencil,
      label: EDIT_LABELS.menuItem,
      onSelect: startEditing,
    },
    isDiscarded &&
      hasAudio && {
        key: "recover",
        icon: ArchiveRestore,
        label: t("controlPanel.history.discarded.recover"),
        onSelect: handleRetry,
      },
    !isDiscarded &&
      hasAudio && { key: "retry", icon: RotateCcw, label: retryLabel, onSelect: handleRetry },
    isTranscribed &&
      rawText !== null && {
        key: "raw",
        icon: FileText,
        label: t("controlPanel.history.viewRawTranscript"),
        onSelect: () => setIsExpanded((expanded) => !expanded),
      },
    hasAudio && {
      key: "folder",
      icon: FolderOpen,
      label: t(getShowInFolderKey()),
      onSelect: () => onShowAudioInFolder?.(item.id),
    },
    {
      key: "delete",
      icon: Trash2,
      label: t("controlPanel.history.deleteItem"),
      onSelect: () => onDelete(item.id),
      destructive: true,
    },
  ];
  const menuActions = candidateActions.filter((action): action is MenuAction => action !== false);

  return (
    <div
      className={cn(
        "group/row px-4 py-3 transition-colors duration-150",
        isFailed
          ? "bg-destructive/5"
          : isDiscarded
            ? "bg-muted/20 opacity-80"
            : "hover:bg-muted/20 dark:hover:bg-white/2",
        // Translation rows get a 2px primary accent; ps-[14px] keeps text aligned with the other rows.
        item.route_kind === "translation" && "border-s-2 border-s-primary/70 ps-[14px]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">{formattedTime}</span>
        <div
          className={cn(
            "-me-1.5 flex items-center gap-1 transition-opacity duration-150",
            // Actions surface on hover, keyboard focus, or while the menu is open; failed and
            // discarded rows keep them visible because recovery is the point of the row.
            isTranscribed &&
              "opacity-0 group-hover/row:opacity-100 has-[:focus-visible]:opacity-100 has-[[data-state=open]]:opacity-100"
          )}
        >
          {isTranscribed && (
            <Tooltip content={t("controlPanel.history.copyText")}>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onCopy(item.text)}
                className={ACTION_BUTTON_CLASS}
              >
                <Copy size={13} />
              </Button>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                disabled={isRetrying}
                aria-label={t("controlPanel.history.moreActions")}
                className={ACTION_BUTTON_CLASS}
              >
                {isRetrying ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <MoreVertical size={13} />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuActions.map(({ key, icon: Icon, label, onSelect, destructive }) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={onSelect}
                  className={cn(
                    "gap-2.5",
                    destructive && "text-destructive focus:bg-destructive/8 focus:text-destructive"
                  )}
                >
                  <Icon size={14} className="shrink-0 opacity-70" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-1.5">
        {isFailed ? (
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-destructive">
                {t("controlPanel.history.transcriptionFailed")}
              </p>
              {item.error_message && (
                <p className="mt-0.5 text-xs leading-relaxed wrap-break-word text-muted-foreground">
                  {item.error_message}
                </p>
              )}
              {isConfigError && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasAudio ? (
                    <>
                      <button
                        onClick={() => onOpenSettings?.()}
                        className="cursor-pointer text-primary hover:underline"
                      >
                        {t("controlPanel.history.failedCtaSettings")}
                      </button>{" "}
                      {t("controlPanel.history.failedCtaAndRetry")}
                    </>
                  ) : (
                    <button
                      onClick={() => onOpenSettings?.()}
                      className="cursor-pointer text-primary hover:underline"
                    >
                      {t("controlPanel.history.failedCtaSettingsOnly")}
                    </button>
                  )}
                </p>
              )}
              {isLimitError && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("controlPanel.history.failedLimitReached")}
                </p>
              )}
              {isOfflineError && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("controlPanel.history.failedOffline")}
                </p>
              )}
            </div>
          </div>
        ) : isDiscarded ? (
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("controlPanel.history.discarded.badge")}
            </span>
            <span className="truncate text-sm text-muted-foreground">
              {discardedDuration
                ? t("controlPanel.history.discarded.recordingWithDuration", {
                    duration: discardedDuration,
                  })
                : t("controlPanel.history.discarded.recording")}
            </span>
          </div>
        ) : isEditing ? (
          // Voice: editor for this entry.
          <div className="space-y-2">
            <textarea
              dir="auto"
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              onKeyDown={(event) => {
                // Ctrl+Enter saves, Escape cancels.
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) saveEdit();
                if (event.key === "Escape") setIsEditing(false);
              }}
              autoFocus
              rows={Math.min(10, Math.max(3, Math.ceil(draftText.length / 80)))}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-base leading-normal text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            />
            {saveError && <p className="text-xs text-destructive">{EDIT_LABELS.saveFailed}</p>}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                {EDIT_LABELS.cancel}
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={isSaving}>
                {isSaving ? EDIT_LABELS.saving : EDIT_LABELS.save}
              </Button>
            </div>
          </div>
        ) : (
          <p
            dir="auto"
            className="text-base leading-normal wrap-break-word whitespace-pre-wrap text-foreground"
          >
            {item.text}
          </p>
        )}
      </div>

      {/* Voice: "Add this as a fix?" box, one row per changed phrase. */}
      {suggestions.length > 0 && (
        <div className="mt-2 space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">{EDIT_LABELS.promptTitle}</p>
            <p className="text-xs text-muted-foreground">{EDIT_LABELS.promptBody}</p>
          </div>
          {suggestions.map((suggestion, index) => (
            <div key={`${suggestion.heard}-${index}`} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-foreground">
                  <span className="line-through opacity-70">{suggestion.heard}</span>
                  {"  →  "}
                  <span className="font-medium">{suggestion.write}</span>
                </span>
                {suggestion.status === "pending" ? (
                  <div className="ms-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resolveSuggestion(index, false)}
                    >
                      {EDIT_LABELS.justOnce}
                    </Button>
                    <Button size="sm" onClick={() => resolveSuggestion(index, true)}>
                      {EDIT_LABELS.addFix}
                    </Button>
                  </div>
                ) : (
                  <span className="ms-auto text-xs text-muted-foreground">
                    {suggestion.status === "added" ? EDIT_LABELS.added : EDIT_LABELS.skipped}
                  </span>
                )}
              </div>
              {suggestion.status === "pending" && isCommonPhrase(suggestion.heard) && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {EDIT_LABELS.commonWarning}
                </p>
              )}
            </div>
          ))}
          {suggestions.every((suggestion) => suggestion.status !== "pending") && (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setSuggestions([])}>
                OK
              </Button>
            </div>
          )}
        </div>
      )}

      {isTranscribed && rawText !== null && (
        <div
          inert={!isExpanded}
          className={cn(
            "grid transition-[grid-template-rows] duration-200",
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mt-2 border-t border-border/70 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("controlPanel.history.rawTranscript")}
                </span>
                <Tooltip content={t("controlPanel.history.copyRawTranscript")}>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onCopy(rawText)}
                    className="h-5 w-5 rounded-sm text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  >
                    <Copy size={10} />
                  </Button>
                </Tooltip>
              </div>
              <p dir="auto" className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
                {rawText}
              </p>
              {rawText === item.text && (
                <p className="mt-1 text-[10px] italic text-muted-foreground/70">
                  {t("controlPanel.history.noAiProcessing")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
