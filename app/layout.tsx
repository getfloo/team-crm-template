import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { syncUser } from "@/db/users";
import { getCaller } from "@/lib/identity";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const APP_NAME = "Team CRM";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Companies, contacts, deals and activity for your team.",
};

const NAV = [
  { href: "/", label: "Pipeline" },
  { href: "/my-deals", label: "My deals" },
  { href: "/companies", label: "Companies" },
  { href: "/api-docs", label: "API docs" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Not-found renders through this layout for /api callers too, so a key must not throw here.
  const caller = await getCaller();
  // Keeps the team directory (deal owners) current with the gateway's name and role.
  if (caller.kind === "user") {
    await syncUser(caller);
  }

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b bg-panel">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
            <Link href="/" className="shrink-0 font-semibold tracking-tight">{APP_NAME}</Link>
            <nav className="order-last flex w-full gap-5 overflow-x-auto text-sm text-muted sm:order-none sm:w-auto sm:gap-6">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="shrink-0 hover:text-ink">{item.label}</Link>
              ))}
            </nav>
            {caller.kind === "user" && (
              // The gateway owns the session: it clears it on this same-origin POST.
              <form action="/__floo/logout" method="post" className="ml-auto flex min-w-0 items-center gap-4 text-sm text-muted">
                <span className="hidden truncate md:block">{caller.email}</span>
                <button type="submit" className="shrink-0 cursor-pointer hover:text-ink">Sign out</button>
              </form>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
