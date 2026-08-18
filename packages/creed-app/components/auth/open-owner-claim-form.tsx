"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@creed/ui/button";
import { EyeToggleIcon } from "@creed/ui/eye-toggle";
import { cn } from "@creed/ui/utils";
import { useAnimatedIconControls } from "@/components/creed/animated-icon-controls";

const OWNER_CODE_LENGTH = 9;
const OWNER_CODE_GROUPS = [3, 3, 3] as const;
const DIGIT_EASE = [0.22, 1, 0.36, 1] as const;
const OWNER_CODE_CLAIM_FAILED = "Could not open this installation.";
const CLAIM_MIN_VISIBLE_MS = 400;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, OWNER_CODE_LENGTH);
}

async function holdClaimSpinner(startedAt: number) {
  const remaining = CLAIM_MIN_VISIBLE_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, remaining));
  }
}

function DigitCell({
  digit,
  delay,
  hidden,
  invalid,
  inputRef,
  index,
  onChange,
  onKeyDown,
  onPaste,
}: {
  digit: string;
  delay: number;
  hidden: boolean;
  invalid: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
  index: number;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-w-0 flex-1">
      {/* Opacity 0 so native selection cannot paint the real digit over the mask.
          Global `.dark ::selection` would otherwise show both glyphs at once. */}
      <input
        ref={inputRef}
        id={index === 0 ? "owner-code" : undefined}
        type="text"
        inputMode="numeric"
        autoComplete={index === 0 ? "one-time-code" : "off"}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        pattern="[0-9]*"
        size={1}
        maxLength={index === 0 ? OWNER_CODE_LENGTH : 1}
        aria-invalid={invalid || undefined}
        aria-label={`Digit ${index + 1} of ${OWNER_CODE_LENGTH}`}
        value={digit}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={(event) => event.currentTarget.select()}
        onMouseUp={(event) => event.currentTarget.select()}
        className="peer absolute inset-0 z-10 h-10 min-w-0 w-full cursor-text text-[17px] opacity-0 outline-none selection:bg-transparent! selection:text-transparent!"
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none flex h-10 items-center justify-center overflow-hidden rounded-[12px] border bg-[var(--creed-surface)] text-[17px] font-medium tabular-nums text-[var(--creed-text-primary)] select-none transition-colors peer-focus-visible:ring-2",
          invalid
            ? "border-[#ef4444] peer-focus-visible:border-[#ef4444] peer-focus-visible:ring-[#ef4444]/15"
            : "border-[var(--creed-border)] peer-focus-visible:border-[var(--creed-accent)] peer-focus-visible:ring-[var(--creed-accent)]/15",
        )}
      >
        <AnimatePresence>
          {digit ? (
            <motion.span
              key={digit}
              className="inline-block"
              initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.72 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.84 }}
              transition={{ duration: 0.18, delay, ease: DIGIT_EASE }}
            >
              {hidden ? "•" : digit}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function OpenOwnerClaimForm({ nextPath = "/" }: { nextPath?: string }) {
  const [digits, setDigits] = useState(() => Array.from({ length: OWNER_CODE_LENGTH }, () => ""));
  const [delays, setDelays] = useState(() => Array.from({ length: OWNER_CODE_LENGTH }, () => 0));
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const eyeShake = useAnimatedIconControls(0, undefined, 600);
  const secret = digits.join("");
  const complete = secret.length === OWNER_CODE_LENGTH;
  const hasDigits = digits.some(Boolean);
  const invalid = Boolean(error);

  function handleClear() {
    applyDigits(Array.from({ length: OWNER_CODE_LENGTH }, () => ""), 0);
  }

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function focusIndex(index: number) {
    inputRefs.current[Math.max(0, Math.min(OWNER_CODE_LENGTH - 1, index))]?.focus();
  }

  function applyDigits(next: string[], nextFocus: number, stagger = false) {
    if (stagger) {
      let step = 0;
      setDelays(
        next.map((digit, index) => {
          if (digit && digit !== digits[index]) return step++ * 0.035;
          return 0;
        }),
      );
    } else {
      setDelays(Array.from({ length: OWNER_CODE_LENGTH }, () => 0));
    }
    setDigits(next);
    setError(null);
    queueMicrotask(() => focusIndex(nextFocus));
  }

  function handleDigitChange(index: number, value: string) {
    const incoming = onlyDigits(value);
    if (!incoming) {
      const next = [...digits];
      next[index] = "";
      applyDigits(next, index);
      return;
    }
    const next = [...digits];
    if (incoming.length === 1) {
      next[index] = incoming;
      applyDigits(next, index + 1);
      return;
    }
    incoming.split("").forEach((digit, offset) => {
      if (index + offset < OWNER_CODE_LENGTH) next[index + offset] = digit;
    });
    applyDigits(next, index + incoming.length, true);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (complete && !submitting) {
        event.currentTarget.form?.requestSubmit();
      }
      return;
    }
    if (/^[0-9]$/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      handleDigitChange(index, event.key);
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      const next = [...digits];
      if (digits[index]) {
        next[index] = "";
        applyDigits(next, index);
        return;
      }
      if (index > 0) {
        next[index - 1] = "";
        applyDigits(next, index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusIndex(index - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusIndex(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pasted = onlyDigits(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    const next = [...digits];
    pasted.split("").forEach((digit, offset) => {
      if (index + offset < OWNER_CODE_LENGTH) next[index + offset] = digit;
    });
    applyDigits(next, index + pasted.length, true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete || submitting) return;

    setSubmitting(true);
    setError(null);
    const startedAt = Date.now();
    try {
      const response = await fetch("/api/open/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || OWNER_CODE_CLAIM_FAILED);
      }
      await holdClaimSpinner(startedAt);
      window.location.assign(nextPath);
    } catch (claimError) {
      await holdClaimSpinner(startedAt);
      setError(
        claimError instanceof Error
          ? claimError.message
          : OWNER_CODE_CLAIM_FAILED,
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 min-w-0 space-y-4">
      {/* Fieldsets default to min-inline-size: min-content and would overflow the card. */}
      <fieldset className="min-w-0 min-is-0">
        <legend className="sr-only">Owner code</legend>
        <div className="flex w-full min-w-0 items-center gap-1.5">
          {OWNER_CODE_GROUPS.map((groupSize, groupIndex) => {
            const start = OWNER_CODE_GROUPS.slice(0, groupIndex).reduce(
              (total, size) => total + size,
              0,
            );
            return (
              <div key={groupIndex} className="contents">
                {groupIndex > 0 ? (
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[15px] text-[var(--creed-text-tertiary)]"
                  >
                    -
                  </span>
                ) : null}
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  {Array.from({ length: groupSize }, (_, offset) => {
                    const index = start + offset;
                    return (
                      <DigitCell
                        key={index}
                        digit={digits[index]}
                        delay={delays[index]}
                        hidden={hidden}
                        invalid={invalid}
                        inputRef={(element) => {
                          inputRefs.current[index] = element;
                        }}
                        index={index}
                        onChange={(value) => handleDigitChange(index, value)}
                        onKeyDown={(event) => handleKeyDown(index, event)}
                        onPaste={(event) => handlePaste(index, event)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
      {error ? (
        <p role="alert" className="sr-only">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            disabled={!hasDigits || submitting}
            onClick={handleClear}
            className="rounded-md border-[var(--creed-border)] disabled:text-[var(--creed-text-tertiary)] disabled:opacity-100"
          >
            Clear
          </Button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={hidden ? "Show owner code" : "Hide owner code"}
            onClick={() => setHidden((value) => !value)}
            onMouseEnter={eyeShake.start}
            onMouseLeave={eyeShake.settle}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--creed-text-tertiary)] transition-colors hover:text-[var(--creed-accent)]"
          >
            <EyeToggleIcon
              ref={eyeShake.iconRef}
              off={hidden}
              size={18}
              className="inline-flex items-center justify-center"
            />
          </button>
        </div>
        <Button
          type="submit"
          disabled={!complete || submitting}
          className="rounded-md bg-[var(--creed-accent)] text-white hover:bg-[var(--creed-accent-hover)]"
        >
          Continue
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        </Button>
      </div>
    </form>
  );
}
