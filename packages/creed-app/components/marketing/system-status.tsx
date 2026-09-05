"use client";

import { useEffect, useState } from "react";
import { buttonVariants } from "@creed/ui/button";
import { cn } from "@creed/ui/utils";

export type SystemStatus =
  | "operational"
  | "degraded"
  | "maintenance"
  | "outage"
  | "unknown";

type StatusVariant = {
  label: string;
  dot: string;
  pulse: string;
  text: string;
};

type LiveStatusColor = "green" | "yellow" | "red" | "neutral";

type LiveStatusResponse = {
  label?: unknown;
  color?: unknown;
};

const DEFAULT_LABEL = "Fully operational";
const STATUS_ENDPOINT = "/api/status";
const REQUEST_TIMEOUT_MS = 8_000;

const STATUS_COLOR_CLASSES: Record<
  LiveStatusColor,
  Pick<StatusVariant, "dot" | "pulse" | "text">
> = {
  green: {
    dot: "bg-[#22C55E]",
    pulse: "bg-[#22C55E]/60",
    text: "text-[var(--creed-text-primary)]",
  },
  yellow: {
    dot: "bg-[#F59E0B]",
    pulse: "bg-[#F59E0B]/60",
    text: "text-[var(--creed-text-primary)]",
  },
  red: {
    dot: "bg-[#DC2626]",
    pulse: "bg-[#DC2626]/60",
    text: "text-[var(--creed-text-primary)]",
  },
  neutral: {
    dot: "bg-[var(--creed-text-tertiary)]",
    pulse: "bg-transparent",
    text: "text-[var(--creed-text-primary)]",
  },
};

const STATUS_VARIANTS: Record<SystemStatus, StatusVariant> = {
  operational: {
    label: DEFAULT_LABEL,
    dot: "bg-[#22C55E]",
    pulse: "bg-[#22C55E]/60",
    text: "text-[var(--creed-text-primary)]",
  },
  degraded: {
    label: "Degraded performance",
    dot: "bg-[#F59E0B]",
    pulse: "bg-[#F59E0B]/60",
    text: "text-[var(--creed-text-primary)]",
  },
  maintenance: {
    label: "Scheduled maintenance",
    dot: "bg-[var(--creed-accent)]",
    pulse: "bg-[var(--creed-accent)]/60",
    text: "text-[var(--creed-text-primary)]",
  },
  outage: {
    label: "Service disruption",
    dot: "bg-[#DC2626]",
    pulse: "bg-[#DC2626]/60",
    text: "text-[var(--creed-text-primary)]",
  },
  unknown: {
    label: "Checking status",
    dot: "bg-[var(--creed-text-tertiary)]",
    pulse: "bg-transparent",
    text: "text-[var(--creed-text-primary)]",
  },
};

function isLiveStatusColor(value: unknown): value is LiveStatusColor {
  return value === "green" || value === "yellow" || value === "red";
}

export function SystemStatusPill({
  status = "unknown",
  href,
  className,
}: {
  status?: SystemStatus;
  href?: string;
  className?: string;
}) {
  const initialVariant = STATUS_VARIANTS[status];
  const [liveStatus, setLiveStatus] = useState<{
    label: string;
    color: LiveStatusColor;
  }>({
    label: initialVariant.label,
    color:
      status === "outage"
        ? "red"
        : status === "operational"
          ? "green"
          : status === "unknown"
            ? "neutral"
            : "yellow",
  });

  useEffect(() => {
    let cancelled = false;
    let pending = false;

    async function loadStatus() {
      // Skip while hidden; the next visible poll (or refocus) catches up.
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const response = await fetch(STATUS_ENDPOINT, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) return;

        const data = (await response.json()) as LiveStatusResponse;
        const label = typeof data.label === "string" ? data.label.trim() : "";
        const color = isLiveStatusColor(data.color) ? data.color : null;

        if (!cancelled && label && color) {
          setLiveStatus({ label, color });
        }
      } catch {
        // Keep the server-rendered fallback if the status endpoint is unreachable.
      } finally {
        pending = false;
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void loadStatus();
    };
    const onFocus = () => void loadStatus();

    void loadStatus();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const variant = {
    ...initialVariant,
    label: liveStatus.label,
    ...STATUS_COLOR_CLASSES[liveStatus.color],
  };
  const Tag = href ? "a" : "div";

  return (
    <Tag
      {...(href ? { href, target: "_blank", rel: "noreferrer" } : {})}
      className={cn(
        buttonVariants({ variant: "outline" }),
        "t-meta rounded-md border-[var(--creed-border)] leading-none",
        variant.text,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            variant.pulse
          )}
        />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", variant.dot)} />
      </span>
      <span className="leading-none">{variant.label}</span>
    </Tag>
  );
}
