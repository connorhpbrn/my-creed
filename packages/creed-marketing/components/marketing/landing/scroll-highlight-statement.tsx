"use client";

import { useRef, type CSSProperties } from "react";
import { accentColorMap } from "@creed/core/creed-data";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

// Ownership first: the file is yours, then it is under your control, then
// Creed is the way it returns to you. Split so each line stays one row
// on desktop.
export const SCROLL_HIGHLIGHT_LINES = [
  "Your personal information is valuable.",
  "It should stay in your control.",
  "Creed gives it back to you.",
] as const;

const LINES = SCROLL_HIGHLIGHT_LINES.map((line, lineIndex) => ({
  words: line.split(" "),
  startIndex: SCROLL_HIGHLIGHT_LINES.slice(0, lineIndex).reduce(
    (count, earlier) => count + earlier.split(" ").length,
    0,
  ),
}));

// YOUR stays the sentence colour. Beats are bold, caps, then the file
// editor's Orange underline and highlight. The mark stays inline so
// its pad cannot grow the section line. Equal vertical pad keeps the
// box balanced; the bar sits in that bottom pad, close to the glyphs,
// because `text-decoration` does not paint through the caps grid.
const EDITOR_PROSE_PX = 17;
const YOUR_ACCENT = accentColorMap.projects;
const YOUR_TINT = "rgba(234, 88, 12, 0.11)";
const YOUR_BAR = "rgba(234, 88, 12, 0.82)";
const YOUR_UNDERLINE_THICKNESS_PX = 4;
const YOUR_UNDERLINE_OFFSET_PX = 0.06 * EDITOR_PROSE_PX - 8;
const YOUR_MARK_RADIUS_PX = 10;
const YOUR_MARK_PAD_Y_EM = 0.03;
const YOUR_MARK_PAD_X_EM = 0.18;
const YOUR_SECTION_STYLE = {
  "--section-accent": YOUR_ACCENT,
  "--section-accent-tint": YOUR_TINT,
  "--section-accent-bar": YOUR_BAR,
} as CSSProperties;
const YOUR_BOLD_DURATION = 1.6;
const YOUR_CAPS_DURATION = 2;
const YOUR_UNDERLINE_DURATION = 2;
const YOUR_HIGHLIGHT_DURATION = 2.2;
const YOUR_BEAT_DURATION =
  YOUR_BOLD_DURATION +
  YOUR_CAPS_DURATION +
  YOUR_UNDERLINE_DURATION +
  YOUR_HIGHLIGHT_DURATION;
const YOUR_BOLD_AT = 0.15;
const YOUR_CAPS_AT = YOUR_BOLD_AT + YOUR_BOLD_DURATION;
const YOUR_UNDERLINE_AT = YOUR_CAPS_AT + YOUR_CAPS_DURATION;
const YOUR_HIGHLIGHT_AT = YOUR_UNDERLINE_AT + YOUR_UNDERLINE_DURATION;
const EFFECTS = [
  { index: 1, duration: 2.4 },
  { index: 9, duration: YOUR_BEAT_DURATION },
  { index: 11, duration: 2.4 },
];
const WORD_COUNT = LINES.reduce((count, line) => count + line.words.length, 0);
const TIMELINE_LENGTH = WORD_COUNT + EFFECTS.reduce((total, effect) => total + effect.duration, 0) + 0.5;
const ease = (value: number) => value * value * (3 - 2 * value);
const clamp = (value: number) => Math.min(1, Math.max(0, value));

function YourLabel({ uppercase }: { uppercase: MotionValue<number> }) {
  const lowerRef = useRef<HTMLSpanElement>(null);
  const upperRef = useRef<HTMLSpanElement>(null);
  const lowerOpacity = useTransform(uppercase, (value) => 1 - value);
  const width = useTransform(uppercase, (amount) => {
    const lower = lowerRef.current;
    const upper = upperRef.current;
    if (!lower || !upper) return undefined;
    const from = lower.getBoundingClientRect().width;
    const to = upper.scrollWidth;
    return from + (to - from) * amount;
  });

  return (
    <>
      <span className="sr-only">your</span>
      <motion.span aria-hidden="true" className="relative inline-block align-baseline" style={{ width }}>
        <span ref={lowerRef} className="invisible inline-block w-max">your</span>
        <span ref={upperRef} className="invisible pointer-events-none absolute top-0 left-[-9999px] w-max">YOUR</span>
        <motion.span className="absolute top-0 left-0 whitespace-nowrap" style={{ opacity: lowerOpacity }}>
          your
        </motion.span>
        <motion.span className="absolute top-0 left-0 whitespace-nowrap" style={{ opacity: uppercase }}>
          YOUR
        </motion.span>
      </motion.span>
    </>
  );
}

function HighlightWord({
  text,
  index,
  progress,
  reducedMotion,
}: {
  text: string;
  index: number;
  progress: MotionValue<number>;
  reducedMotion: boolean;
}) {
  const offset = EFFECTS.filter((effect) => effect.index < index).reduce(
    (total, effect) => total + effect.duration, 0,
  );
  const duration = EFFECTS.find((effect) => effect.index === index)?.duration ?? 2.4;
  const start = index + offset - 0.35;
  const end = index + offset + 1.1;
  const isPersonal = index === 1;
  const isYour = index === 9;
  const isCreed = index === 11;
  // The extra beat starts after full highlight and delays every following word.
  const effect = useTransform(progress, (value) =>
    reducedMotion ? 1 : ease(clamp((value * TIMELINE_LENGTH - end - 0.15) / (duration - 0.65))),
  );
  const yourCaps = useTransform(progress, (value) =>
    reducedMotion ? 1 : ease(clamp((value * TIMELINE_LENGTH - end - YOUR_CAPS_AT) / YOUR_CAPS_DURATION)),
  );
  const yourBold = useTransform(progress, (value) =>
    reducedMotion ? 1 : ease(clamp((value * TIMELINE_LENGTH - end - YOUR_BOLD_AT) / YOUR_BOLD_DURATION)),
  );
  const yourUnderline = useTransform(progress, (value) =>
    reducedMotion ? 1 : ease(clamp((value * TIMELINE_LENGTH - end - YOUR_UNDERLINE_AT) / YOUR_UNDERLINE_DURATION)),
  );
  const yourHighlight = useTransform(progress, (value) =>
    reducedMotion ? 1 : ease(clamp((value * TIMELINE_LENGTH - end - YOUR_HIGHLIGHT_AT) / YOUR_HIGHLIGHT_DURATION)),
  );
  const yourWeight = useTransform(yourBold, (value) => 500 + value * 200);
  const yourUnderlineColor = useTransform(
    yourUnderline,
    (value) => `color-mix(in srgb, transparent, ${YOUR_BAR} ${value * 100}%)`,
  );
  const yourMarkBackground = useTransform(
    yourHighlight,
    (value) =>
      `color-mix(in srgb, transparent, color-mix(in srgb, var(--creed-surface), ${YOUR_ACCENT} 11%) ${value * 100}%)`,
  );
  const yourMarkPadX = useTransform(yourHighlight, (value) => `${value * YOUR_MARK_PAD_X_EM}em`);
  const yourMarkPadY = useTransform(yourHighlight, (value) => `${value * YOUR_MARK_PAD_Y_EM}em`);
  const color = useTransform(progress, (value) => {
    const position = value * TIMELINE_LENGTH;
    const lit = reducedMotion ? 1 : clamp((position - start) / (end - start));
    const highlighted = `color-mix(in srgb, var(--creed-text-tertiary) ${100 - lit * 100}%, var(--creed-text-primary))`;
    const amount = reducedMotion ? 1 : ease(clamp((position - end - 0.15) / (duration - 0.65)));
    if (isPersonal) return `color-mix(in srgb, ${highlighted}, ${accentColorMap.skills} ${amount * 100}%)`;
    return highlighted;
  });
  const padding = useTransform(effect, (value) => `${value * 0.16}em`);
  const backgroundColor = useTransform(effect, (value) => `color-mix(in srgb, transparent, ${accentColorMap.skills} ${value * 13.3}%)`);
  const hashWidth = useTransform(effect, (value) => `${value * 0.65}em`);
  const hashX = useTransform(effect, [0, 1], ["0.35em", "0em"]);
  const hashOpacity = useTransform(effect, (value) => value ** 2.6 * 0.7);
  const markWidth = useTransform(effect, (value) => `${value * 0.95}em`);
  const markX = useTransform(effect, [0, 1], ["0.35em", "0em"]);
  const markOpacity = useTransform(effect, (value) => value ** 2.6);

  return (
    <motion.span
      className={
        isYour
          ? "relative inline whitespace-nowrap align-baseline"
          : "relative inline-block whitespace-nowrap align-baseline"
      }
      style={{
        color,
        ...(isYour ? YOUR_SECTION_STYLE : {}),
        ...(isPersonal ? { paddingInline: padding, backgroundColor, borderRadius: "0.24em" } : {}),
      }}
    >
      {isPersonal ? (
        <motion.span aria-hidden="true" className="inline-block align-bottom" style={{ width: hashWidth }}>
          <motion.span className="inline-block" style={{ opacity: hashOpacity, x: hashX }}>#</motion.span>
        </motion.span>
      ) : null}
      {isCreed ? (
        <motion.span aria-hidden="true" className="inline-block align-[-0.06em]" style={{ width: markWidth }}>
          <motion.span
            className="block h-[0.78em] w-[0.78em]"
            style={{
              backgroundColor: "#0066FF",
              opacity: markOpacity,
              x: markX,
              mask: "url(/assets/brand/icon.svg) center / contain no-repeat",
              WebkitMask: "url(/assets/brand/icon.svg) center / contain no-repeat",
            }}
          />
        </motion.span>
      ) : null}
      {isYour ? (
        <motion.mark
          className="creed-file-mark"
          style={{
            background: yourMarkBackground,
            paddingBlock: yourMarkPadY,
            paddingInline: yourMarkPadX,
            borderRadius: YOUR_MARK_RADIUS_PX,
          }}
        >
          <motion.strong className="relative" style={{ fontWeight: yourWeight }}>
            <YourLabel uppercase={yourCaps} /><motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0"
              style={{
                top: "100%",
                marginTop: YOUR_UNDERLINE_OFFSET_PX,
                height: YOUR_UNDERLINE_THICKNESS_PX,
                backgroundColor: yourUnderlineColor,
              }}
            />
          </motion.strong>
        </motion.mark>
      ) : (
        text
      )}
    </motion.span>
  );
}

export function ScrollHighlightStatement() {
  const trackRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion() === true;
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      ref={trackRef}
      className={
        reducedMotion
          ? "relative overflow-clip"
          : "relative h-[660vh] overflow-clip"
      }
    >
      {/* Tall track, sticky copy: progress can paint words while the
          paragraph stays on screen. */}
      <div className="sticky top-0 flex min-h-svh items-center justify-center bg-transparent px-6 py-24 [contain:paint]">
        <p className="t-section max-w-full text-center leading-[1.3]! text-[var(--creed-text-primary)]">
          {LINES.map((line) => (
            <span
              key={line.startIndex}
              className="block lg:whitespace-nowrap"
            >
              {line.words.map((text, wordIndex) => (
                <span key={`${line.startIndex}-${wordIndex}`}>
                  {wordIndex > 0 ? " " : null}
                  <HighlightWord
                    text={text}
                    index={line.startIndex + wordIndex}
                    progress={scrollYProgress}
                    reducedMotion={reducedMotion}
                  />
                </span>
              ))}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
