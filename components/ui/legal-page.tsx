import Link from "next/link";
import { Logo } from "@/components/ui/logo";

type LegalSection = {
  heading: string;
  body: string;
};

export function LegalPage({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen w-full bg-[#08090A] text-white">
      <div className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-100 no-underline transition-opacity hover:opacity-80"
        >
          <Logo className="h-6 w-6 text-white" />
          <span className="text-lg font-semibold tracking-tight">memos</span>
        </Link>

        <h1 className="mt-12 text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-neutral-500">Last updated: {lastUpdated}</p>

        <p className="mt-8 text-base leading-relaxed text-neutral-300">{intro}</p>

        <div className="mt-10 flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {section.heading}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-neutral-400">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-white/10 pt-8">
          <Link
            href="/"
            className="text-sm text-neutral-400 no-underline transition-colors hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
