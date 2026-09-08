import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@creed/persistence/supabase/env";
import { AnimatedPageTitle } from "@/components/marketing/animated-page-title";
import { CreedBenchChart } from "@/components/marketing/creed-bench-chart";
import {
  MarketingFooter,
  MarketingHeroBanner,
} from "@/components/marketing/site-chrome";
import { JsonLd } from "@/components/marketing/json-ld";
import { marketingHomePath } from "@/lib/marketing/home";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";
import { BENCH_PAGE_PUBLIC } from "@/lib/marketing-routes";

const PATH = "/bench";
const TITLE = "Benchmarks";

export const metadata: Metadata = {
  title: TITLE,
  robots: BENCH_PAGE_PUBLIC
    ? undefined
    : { index: false, follow: false },
};

export default function BenchPage() {
  if (!BENCH_PAGE_PUBLIC) notFound();

  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({ path: PATH, name: TITLE, description: TITLE }),
          breadcrumbSchema(PATH, [
            { name: "Creed", path: marketingHomePath() },
            { name: "Benchmarks", path: PATH },
          ])
        )}
      />
      <div className="flex min-h-screen flex-col bg-[var(--creed-background)] text-[var(--creed-text-primary)]">
        <MarketingHeroBanner configured={isSupabaseConfigured()} scrolled={false} />

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-8 sm:px-6 md:px-10 md:pb-24 md:pt-10">
          <header className="border-b border-[var(--creed-border)] pb-8">
            <AnimatedPageTitle text={TITLE} />
          </header>
          <div className="mt-12">
            <CreedBenchChart />
          </div>
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}
