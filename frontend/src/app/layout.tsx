import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Switch Configurator",
  description: "Automated Serial Switch Configuration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-50 antialiased selection:bg-blue-500/30">
        <div className="flex h-screen flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="w-full md:w-64 border-b md:border-r border-neutral-800 bg-neutral-900/50 backdrop-blur-xl p-4 flex flex-col gap-6">
            <div className="flex items-center gap-2 px-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20">
                SC
              </div>
              <span className="text-lg font-bold tracking-tight text-neutral-100">SwitchConfig</span>
            </div>

            <nav className="flex flex-col gap-1">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/console">Live Console</NavLink>
              <NavLink href="/templates">Templates</NavLink>
              <NavLink href="/jobs">Jobs</NavLink>
              <div className="my-2 border-t border-neutral-800" />
              <NavLink href="/settings">Settings</NavLink>
            </nav>

            <div className="mt-auto rounded-lg bg-neutral-800/50 p-3 text-xs text-neutral-500 border border-neutral-800">
              <p>Connected: <span className="text-emerald-500 font-medium">Localhost</span></p>
              <p>Worker: <span className="text-amber-500 font-medium">Idle</span></p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-neutral-950 p-6 md:p-8">
            <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all duration-200"
    >
      {children}
    </Link>
  );
}
