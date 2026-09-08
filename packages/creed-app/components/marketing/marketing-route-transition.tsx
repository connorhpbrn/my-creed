"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

let previousHero: { pathname: string; height: number; scrollY: number } | null = null;
let preserveHeroContentOnNextNavigation = false;

export function MarketingRouteTransition() {
  const pathname = usePathname();
  const entryHero = useRef(previousHero);

  useLayoutEffect(() => {
    const preserveHeroContent = preserveHeroContentOnNextNavigation;
    preserveHeroContentOnNextNavigation = false;
    const hero = document.querySelector<HTMLElement>("[data-marketing-hero]");
    if (!hero) {
      previousHero = null;
      return;
    }

    const height = hero.getBoundingClientRect().height;
    const previous = previousHero?.pathname === pathname ? entryHero.current : previousHero;
    const currentHero = { pathname, height, scrollY: window.scrollY };
    previousHero = currentHero;
    const nearTop = window.scrollY <= 64;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animation: Animation | undefined;
    const content = hero.querySelector<HTMLElement>("[data-marketing-hero-content]");
    let contentAnimation: Animation | undefined;
    if (content && !reducedMotion && nearTop && !preserveHeroContent) {
      contentAnimation = content.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: 280,
          delay: previous && previous.pathname !== pathname ? 100 : 0,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        },
      );
    }

    if (
      previous &&
      previous.pathname !== pathname &&
      previous.scrollY <= 64 &&
      nearTop &&
      (previous.pathname === "/home" || pathname === "/home") &&
      !reducedMotion
    ) {
      animation = hero.animate(
        [{ height: `${previous.height}px` }, { height: `${height}px` }],
        { duration: 380, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      );
    }

    function trackScroll() {
      currentHero.scrollY = window.scrollY;
      if (window.scrollY > 64) {
        animation?.cancel();
        contentAnimation?.cancel();
      }
    }

    function fadeOnNavigation(event: MouseEvent) {
      if (!content || reducedMotion || window.scrollY > 64 || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link || link.target || link.hasAttribute("download")) return;
      if (link.hasAttribute("data-preserve-hero-content")) {
        preserveHeroContentOnNextNavigation = true;
        contentAnimation?.cancel();
        content.style.opacity = "1";
        return;
      }
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === pathname) return;
      preserveHeroContentOnNextNavigation = false;
      contentAnimation?.cancel();
      contentAnimation = content.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 160, easing: "ease-out" },
      );
    }

    document.addEventListener("click", fadeOnNavigation, true);
    window.addEventListener("scroll", trackScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", trackScroll);
      document.removeEventListener("click", fadeOnNavigation, true);
      animation?.cancel();
      contentAnimation?.cancel();
    };
  }, [pathname]);

  return null;
}
