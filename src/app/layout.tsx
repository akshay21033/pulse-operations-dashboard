import type { Metadata } from "next";
import { Suspense } from "react";
import { QueueBadgeLoader } from "@/components/queue-badge-loader";
import { Sidebar } from "@/components/sidebar";
import { getRole } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Pulse · Operations", template: "%s · Pulse" },
  description: "A clear view of every shipment in motion.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const role = await getRole();
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="app-shell">
          <Sidebar
            role={role}
            queueBadge={
              <Suspense fallback={null}>
                <QueueBadgeLoader />
              </Suspense>
            }
          />
          <main id="main" tabIndex={-1} className="main-area">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
