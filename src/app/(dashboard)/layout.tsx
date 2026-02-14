"use client"; // WAJIB ADA karena kita pakai state untuk handle hydration

import { useState, useEffect, ReactNode } from "react";
import AppSidebar from "@/components/common/app-sidebar";
import { DarkmodeToggle } from "@/components/common/darkmode-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import DashboardBreadcrumb from "./_components/dashboard-breadcrumb";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1">
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <DashboardBreadcrumb />
          </div>
          <div className="flex items-center gap-4">
            <DarkmodeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col items-start gap-4 p-4 pt-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
