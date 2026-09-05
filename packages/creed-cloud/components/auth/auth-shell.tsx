"use client";

// Shared split-screen chrome for the auth surface: the branded left column
// (wordmark, optional top-right link, centred content, footer) and the framed
// image panel on the right. /signin, /signup and /reset-password all render
// inside it so they stay visually identical.

import Link from "next/link";
import type { ReactNode } from "react";
import { SceneryImage } from "@/components/marketing/scenery-image";
import { CreedWordmark } from "@/components/creed/brand";
import { BrandedCredit } from "@creed/ui/branded-credit";
import { STATUS_URL } from "@/lib/branding";

const panelImage = "/assets/landing/garden.png";

export function AuthShell({ topRight, children }: { topRight?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-[var(--creed-background)] text-[var(--creed-text-primary)]">
      <div className="flex w-full flex-col px-6 py-5 md:w-1/2 md:px-8 md:py-6">
        <div className="flex items-center justify-between">
          <Link
            href="/home"
            aria-label="Creed home"
            className="-ml-1 inline-flex shrink-0 items-center transition-opacity duration-200 hover:opacity-60"
          >
            <CreedWordmark className="ml-0" />
          </Link>
          {topRight ? <div>{topRight}</div> : null}
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>

        <div className="flex items-center justify-between text-[13px]">
          <BrandedCredit
            accent="var(--creed-accent)"
            className="t-meta justify-start text-[var(--creed-text-tertiary)]"
          />
          <div className="flex items-center gap-5">
            <a href={STATUS_URL} className="font-medium text-[var(--creed-text-primary)] transition-colors hover:text-[var(--creed-accent)]">
              Status
            </a>
            <Link href="https://docs.creed.md" className="font-medium text-[var(--creed-text-primary)] transition-colors hover:text-[var(--creed-accent)]">
              Docs
            </Link>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden rounded-[20px] md:my-2 md:mr-2 md:block md:flex-1">
        <SceneryImage
          src={panelImage}
          fileName="garden.png"
          label="Garden"
          sizes="(min-width: 768px) 50vw, 100vw"
          priority
          hint="portrait"
        />
      </div>
    </div>
  );
}
