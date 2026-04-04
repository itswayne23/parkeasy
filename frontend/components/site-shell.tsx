import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <div className="nav-wrap">
        <header className="nav page">
          <Link className="brand" href="/">
            <span className="brand-mark" />
            <span>ParkEasy</span>
          </Link>
          <nav className="nav-links">
            <Link className="nav-link" href="/search">Experience</Link>
            <Link className="nav-link" href="/listings/gs-road-driveway">Listing</Link>
            <Link className="nav-link" href="/dashboard/renter">Renter</Link>
            <Link className="nav-link" href="/dashboard/host">Host</Link>
            <Link className="nav-link" href="/dashboard/admin">Admin</Link>
            <ThemeToggle />
            <Link className="nav-pill" href="/auth/sign-in">Sign in</Link>
          </nav>
        </header>
      </div>
      {children}
      <footer className="footer page">
        <div className="inline-actions">
          <span className="status-dot" />
          <span>ParkEasy beta system online for Guwahati launch</span>
        </div>
        <div className="footer-links">
          <Link href="/search">Explore</Link>
          <Link href="/dashboard/host">Host earnings</Link>
          <Link href="/dashboard/admin">Trust ops</Link>
        </div>
      </footer>
    </div>
  );
}
