import { useEffect, type ReactNode } from "react";
import { Helmet } from "react-helmet";
import { portfolioData } from "@shared/portfolio.ts";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalPageProps {
  title: string;
  intro?: ReactNode;
  sections: LegalSection[];
}

// "2026-10-19" -> "October 19, 2026" (UTC, so the day never shifts with the visitor's time zone)
export function formatLegalDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// "Sole trader (…)" -> "sole trader (…)", for use mid-sentence
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// Wraps a table so that only the table scrolls horizontally on small screens
export function LegalTable({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 overflow-x-auto rounded-md border">
      <table className="my-0 w-full min-w-[34rem] text-sm">{children}</table>
    </div>
  );
}

export default function LegalPage({ title, intro, sections }: LegalPageProps) {
  // SPA navigation keeps the previous scroll position: start at the top,
  // or at the requested section when the URL carries a hash
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const target = hash
      ? document.getElementById(decodeURIComponent(hash))
      : null;
    if (target) {
      target.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <Helmet>
        <title>{`${title} - ${portfolioData.legal.publisher.name}`}</title>
      </Helmet>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated:{" "}
          <time dateTime={portfolioData.legal.lastUpdated}>
            {formatLegalDate(portfolioData.legal.lastUpdated)}
          </time>
        </p>
      </header>

      <div className="prose prose-gray max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-th:text-left prose-th:px-3 prose-td:px-3 prose-headings:scroll-mt-24">
        {intro}

        <nav
          aria-label="Contents"
          className="not-prose my-8 rounded-lg bg-gray-50 p-5"
        >
          <p className="mb-2 text-sm font-semibold text-gray-900">Contents</p>
          <ol className="space-y-1 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-gray-600 hover:text-gray-900 hover:underline"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id} className="group">
              {section.title}
              <a
                href={`#${section.id}`}
                aria-label={`Link to section "${section.title}"`}
                className="ml-2 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                #
              </a>
            </h2>
            {section.content}
          </section>
        ))}
      </div>
    </article>
  );
}
