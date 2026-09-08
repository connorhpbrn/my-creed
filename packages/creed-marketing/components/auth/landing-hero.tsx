"use client";

import Link from "next/link";
import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SceneryImage } from "@/components/marketing/scenery-image";
import { MarketingHeader } from "@/components/marketing/site-chrome";
import { useLandingAuthState } from "@/components/marketing/use-landing-auth-state";
import { useEditionContinueHref } from "@creed/edition/ui";
import {
  AirplaneIcon,
  type AirplaneIconHandle,
} from "@creed/ui/airplane";
import { useCreedEdition } from "@/components/creed/edition-provider";
import { GITHUB_URL } from "@/lib/branding";
import { useDelayedNavigationPending } from "@/components/marketing/delayed-navigation-spinner";
import { LoaderCircle } from "lucide-react";

const heroImage = "/assets/landing/garden.png";

export function LandingHero({ configured }: { configured: boolean }) {
  const { hostedAccounts: hasHostedAccounts } = useCreedEdition().capabilities;
  const cloudAuthEnabled = configured && hasHostedAccounts;
  const authState = useLandingAuthState(cloudAuthEnabled);
  const { href: ctaHref, isPaid } =
    useEditionContinueHref();
  const heroAirplaneRef = useRef<AirplaneIconHandle>(null);
  const { pending, beginPending } = useDelayedNavigationPending();

  const ctaLabel =
    !hasHostedAccounts
      ? "View on GitHub"
      : authState !== "signed-in"
      ? "Get Started"
      : isPaid
        ? "Go to app"
        : "Get Started";
  const resolvedHref =
    !hasHostedAccounts
      ? GITHUB_URL
      : authState === "signed-in"
        ? ctaHref
        : "/pricing";

  return (
    <>
      <MarketingHeader configured={configured} scrolled={false} />
      <section className="relative bg-[var(--creed-background)]">
        <div data-marketing-hero className="relative m-2 flex h-[calc(100svh-1rem)] flex-col overflow-hidden rounded-[20px]">
          {/* SceneryImage self-heals to a labelled placeholder if the source is
              ever missing. */}
          <div className="absolute inset-x-0 top-0 h-[calc(100svh-1rem)] overflow-hidden rounded-[20px]">
            <SceneryImage
              src={heroImage}
              fileName="garden.png"
              label="Garden"
              priority
              hint="landscape, ~16:9"
            />
          </div>

          <div className="relative z-10 flex h-[calc(100svh-1rem)] shrink-0 flex-col px-6 py-5 md:px-10 md:py-7">
            <div className="flex flex-1 items-center justify-center pb-[10vh] text-center">
              <div data-marketing-hero-content className="w-full max-w-3xl">
                <h1 className="t-hero justify-center text-[clamp(1.5rem,7.5vw,2.2rem)]! text-white sm:text-[clamp(2.2rem,9vw,3rem)]! md:text-[clamp(2.75rem,5.5vw,3.75rem)]!">
                  {["Your personal context", "all in one place"].map((line) => (
                    <span key={line} className="block whitespace-nowrap">
                      {line}
                    </span>
                  ))}
                </h1>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={resolvedHref}
                    target={!hasHostedAccounts ? "_blank" : undefined}
                    rel={!hasHostedAccounts ? "noreferrer" : undefined}
                    aria-busy={pending}
                    data-preserve-hero-content={
                      hasHostedAccounts && authState === "signed-in" && isPaid
                        ? ""
                        : undefined
                    }
                    onClick={hasHostedAccounts ? beginPending : undefined}
                    onMouseEnter={() =>
                      heroAirplaneRef.current?.startAnimation()
                    }
                    onMouseLeave={() =>
                      heroAirplaneRef.current?.stopAnimation()
                    }
                    onPointerDown={(event) => {
                      if (event.pointerType !== "mouse") {
                        heroAirplaneRef.current?.startAnimation();
                      }
                    }}
                    onPointerUp={(event) => {
                      if (event.pointerType !== "mouse") {
                        heroAirplaneRef.current?.stopAnimation();
                      }
                    }}
                    className="inline-flex h-9 items-center justify-center gap-2.5 rounded-md border border-white/15 bg-[#2563eb] px-3 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_3px_6px_rgba(0,0,0,0.06)] transition-colors hover:bg-[#3b76ef] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    <span className="leading-none">{ctaLabel}</span>
                    <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
                      <AnimatePresence initial={false} mode="popLayout">
                        {pending ? (
                          <motion.span
                            key="spinner"
                            initial={{ opacity: 0, scale: 0.75 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.75 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 inline-flex items-center justify-center"
                          >
                            <LoaderCircle className="size-4 animate-spin" />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="airplane"
                            initial={false}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.75 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 inline-flex items-center justify-center"
                          >
                            <AirplaneIcon
                              ref={heroAirplaneRef}
                              size={16}
                              className="inline-flex shrink-0 items-center justify-center leading-none"
                            />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
