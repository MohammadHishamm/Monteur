import React from "react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

export function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav mode="default" />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
