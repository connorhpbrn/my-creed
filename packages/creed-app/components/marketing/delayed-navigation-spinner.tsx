"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle } from "lucide-react";

const NAVIGATION_SPINNER_DELAY_MS = 180;

export function useDelayedNavigationPending() {
  const [pending, setPending] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  function beginPending(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => setPending(true),
      NAVIGATION_SPINNER_DELAY_MS,
    );
  }

  return { pending, beginPending };
}

export function DelayedNavigationSpinner({
  pending,
  className,
}: {
  pending: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {pending ? (
        <motion.span
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 20, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex shrink-0 items-center justify-end overflow-hidden"
        >
          <LoaderCircle className={className ?? "h-3.5 w-3.5 animate-spin"} />
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
