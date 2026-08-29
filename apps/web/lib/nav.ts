import {
  BookOpen,
  FileText,
  FlaskConical,
  History,
  LayoutDashboard,
  PenLine,
  Settings,
  Share2,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const APP_NAV: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/writer", label: "Writer Studio", icon: PenLine },
  { href: "/research", label: "Research Studio", icon: FlaskConical },
  { href: "/social", label: "Social Studio", icon: Share2 },
  { href: "/editor", label: "Editor", icon: FileText },
  { href: "/templates", label: "Templates", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function moduleHref(module: string, docId: string) {
  if (module === "social") return `/social?doc=${docId}`;
  if (module === "research") return `/research?doc=${docId}`;
  if (module === "editor" || module === "templates") return `/editor?doc=${docId}`;
  return `/writer?doc=${docId}`;
}
