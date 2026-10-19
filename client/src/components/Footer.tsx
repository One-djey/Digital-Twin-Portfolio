import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { portfolioData } from "@shared/portfolio.ts";
import { LEGAL_ROUTES } from "@shared/chat.ts";

const legalLinks = [
  { href: LEGAL_ROUTES.notice, label: "Legal notice" },
  { href: LEGAL_ROUTES.privacy, label: "Privacy policy" },
];
const contactLink = { href: "/contact", label: "Contact" };

export default function Footer() {
  const [location] = useLocation();
  const currentYear = new Date().getFullYear();

  // Home is a full-height chat (h-[calc(100vh-5rem)] under the 65px navbar),
  // which leaves 15px of viewport: the footer shrinks to a single 14px line
  // there so the page never scrolls. Home has no floating chat button, so the
  // side padding that keeps other pages clear of it is not needed either.
  const isHomePage = location === "/";
  const links = isHomePage ? legalLinks : [...legalLinks, contactLink];

  return (
    <footer
      className={cn(
        "text-muted-foreground",
        isHomePage
          ? "h-3.5 overflow-hidden text-[11px] leading-[14px]"
          : "mt-12 border-t py-6 text-xs",
      )}
    >
      <div
        className={cn(
          "container mx-auto flex items-center justify-center gap-x-2",
          // px-16 keeps the links clear of the floating chat button (bottom-right)
          isHomePage ? "flex-nowrap px-4" : "flex-wrap gap-y-1 px-16",
        )}
      >
        <span>
          &copy; {currentYear} {portfolioData.legal.publisher.name}
        </span>
        {links.map((link) => (
          <span key={link.href} className="flex items-center gap-x-2">
            <span aria-hidden="true">·</span>
            <Link
              href={link.href}
              className="hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          </span>
        ))}
      </div>
    </footer>
  );
}
