import { NavLink, Outlet } from "react-router-dom";
import { useAppBootstrap } from "../hooks/useAppBootstrap";
import ApiToastStack from "./ApiToastStack";
import ApiTransportPanel from "./ApiTransportPanel";

const PinIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const GlobeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v6a2 2 0 002 2h2M15 11h4.945M15 11V9a2 2 0 00-2-2h-2M9 11V9a2 2 0 012-2h2m-6 4v6a2 2 0 002 2h2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const DocIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M5 5h8l4 4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
  </svg>
);
const GridIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 12h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
  </svg>
);
const ChartIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m4 14V9m4 10V7m4 12v-8" />
  </svg>
);
const SparkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.5 4.5L19 12l-5.5 3L10 19l-2.5-4L2 12l5.5-3L10 5z" />
  </svg>
);

const nav = [
  { to: "/", end: true, label: "Country Dashboard", icon: PinIcon },
  { to: "/global", label: "Global Analytics", icon: GlobeIcon },
  { to: "/pestel", label: "PESTEL", icon: DocIcon },
  { to: "/porter", label: "Porter 5 Forces", icon: GridIcon },
  { to: "/business", label: "Business Analytics", icon: ChartIcon },
  { to: "/assistant", label: "Analytics Assistant", icon: SparkIcon },
  { to: "/sources", label: "Source", icon: DocIcon },
];

export default function Layout() {
  useAppBootstrap();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="w-full px-3 py-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="grid grid-cols-1 gap-3">
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Country Analytics Platform
            </h1>
            <p className="max-w-3xl text-sm leading-snug text-slate-600 xl:max-w-[42rem]">
              A modern, analyst-grade view across financial, demographic, and health metrics for every country
              (2000 – latest), powered by World Bank, UN, UNESCO, WHO, and IMF data.
            </p>
            <div className="flex w-full justify-end">
              <ApiTransportPanel variant="inline" inlineAlign="end" />
            </div>
          </div>
          <nav className="mt-3 flex flex-wrap gap-1.5 sm:gap-2 lg:mt-3">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-red-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="w-full flex-1 px-3 py-4 pb-10 sm:px-4 sm:py-5 sm:pb-12 lg:px-6 lg:py-5 xl:px-8">
        <Outlet />
      </main>
      <ApiToastStack />
      <footer className="border-t border-slate-200 bg-white px-3 py-3 text-center text-xs text-slate-500 sm:px-4 lg:px-6 xl:px-8">
        <p className="text-slate-600">Developed, managed, and maintained by Rifqi Tjahyono</p>
        <div className="mt-2 flex justify-center gap-4">
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 transition hover:text-red-600"
            aria-label="LinkedIn"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
          <a
            href="https://rifqi-tjahyono.com"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 transition hover:text-red-600"
            aria-label="Website"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v6a2 2 0 002 2h2M15 11h4.945M15 11V9a2 2 0 00-2-2h-2M9 11V9a2 2 0 012-2h2m-6 4v6a2 2 0 002 2h2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
