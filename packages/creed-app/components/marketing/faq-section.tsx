import type { FaqItem } from "@/lib/marketing/faq";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export function FaqSection({
  heading,
  items,
  className,
}: {
  heading?: string;
  items: FaqItem[];
  className?: string;
}) {
  return (
    <section className={className}>
      {heading ? (
        <h2 className="text-[22px] font-medium tracking-[-0.01em] text-[var(--creed-text-primary)] md:text-[26px]">
          {heading}
        </h2>
      ) : null}
      <div className={heading ? "mt-6" : undefined}>
        <FaqAccordion items={items} />
      </div>
    </section>
  );
}
