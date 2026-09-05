"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@creed/ui/utils";

// Sub-pixel measure + overflow-hidden clips the last glyph. A 2px pad keeps
// Copy / Hide / Imported fully visible without changing the 300ms ease.
const WIDTH_PAD = 2;
const widthCache = new Map<string, Record<string, number>>();

function paddedWidth(width: number) {
  return Math.ceil(width) + WIDTH_PAD;
}

function isCompleteMeasure(
  labels: readonly string[],
  widths: Record<string, number> | null | undefined,
) {
  return !!widths && labels.every((label) => (widths[label] ?? 0) > 0);
}

/**
 * Different-width labels snap the button and shove neighbours unless the
 * wrapper is locked to the measured active width and animated between them.
 * The first paint stays unanimated so a remounted menu row does not shrink
 * from the longest option down to the current one. Width only eases after
 * the value changes; page load and hidden-surface measures never slide.
 */
export function SwapLabel({
  value,
  options,
  className,
}: {
  value: string;
  options: readonly string[];
  className?: string;
}) {
  const optionKey = Array.from(
    new Set(options.includes(value) ? options : [...options, value]),
  ).join("\0");
  const labels = optionKey.split("\0");
  const refs = useRef(new Map<string, HTMLSpanElement>());
  const measuredKeyRef = useRef<string | null>(null);
  const valueRef = useRef(value);
  const cachedWidths = widthCache.get(optionKey);
  const hasCachedWidths = isCompleteMeasure(labels, cachedWidths);
  const [widths, setWidths] = useState<Record<string, number> | null>(
    hasCachedWidths ? cachedWidths! : null,
  );
  const [ready, setReady] = useState(hasCachedWidths);
  const [animateWidth, setAnimateWidth] = useState(false);

  useLayoutEffect(() => {
    // Only drop the width transition when the option set changes. Rapid
    // value toggles must keep the 300ms ease or the label flashes.
    const optionSetChanged = measuredKeyRef.current !== optionKey;
    if (optionSetChanged) {
      setAnimateWidth(false);
      valueRef.current = value;
      if (!isCompleteMeasure(optionKey.split("\0"), widthCache.get(optionKey))) {
        setReady(false);
      }
    }
    const currentLabels = optionKey.split("\0");
    const measure = () => {
      const next: Record<string, number> = {};
      for (const label of currentLabels) {
        const node = refs.current.get(label);
        if (!node) continue;
        const width = node.getBoundingClientRect().width;
        // Hidden persistent surfaces measure as 0. Ignore those so the first
        // visible paint snaps instead of sliding from a 2px stub.
        if (width > 0) next[label] = width;
      }
      if (!isCompleteMeasure(currentLabels, next)) return;
      widthCache.set(optionKey, next);
      setWidths((current) => {
        if (
          current &&
          currentLabels.every(
            (label) =>
              current[label] !== undefined &&
              Math.abs(current[label] - next[label]) < 0.5,
          )
        ) {
          return current;
        }
        return next;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    for (const node of refs.current.values()) {
      observer.observe(node);
    }
    const frame = window.requestAnimationFrame(() => {
      measuredKeyRef.current = optionKey;
      setReady(true);
    });
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [optionKey]);

  useLayoutEffect(() => {
    if (valueRef.current === value) return;
    valueRef.current = value;
    if (ready) setAnimateWidth(true);
  }, [ready, value]);

  const labelClassName =
    "col-start-1 row-start-1 w-fit justify-self-start whitespace-nowrap transition-opacity duration-200 ease-out motion-reduce:transition-none";

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "grid min-w-0 shrink-0 grid-cols-1 grid-rows-1 overflow-hidden",
          ready &&
            animateWidth &&
            "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          className,
        )}
        style={{
          width: widths?.[value] == null ? undefined : paddedWidth(widths[value]),
        }}
      >
        {labels.map((label) => (
          <span
            key={label}
            ref={(node) => {
              if (node) {
                refs.current.set(label, node);
              } else {
                refs.current.delete(label);
              }
            }}
            className={cn(
              labelClassName,
              label === value ? "opacity-100" : "opacity-0",
            )}
          >
            {label}
          </span>
        ))}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
