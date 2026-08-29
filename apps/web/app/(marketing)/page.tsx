import type { Metadata } from "next";
import { LandingPage } from "@/modules/marketing/landing-page";

export const metadata: Metadata = {
  title: "CreatorOS — Write, research, and publish in one studio",
  description:
    "CreatorOS is an AI operating system for creators: Writer, Research with Academic Mode, and Social — without chatbot clutter.",
};

export default function MarketingHomePage() {
  return <LandingPage />;
}
