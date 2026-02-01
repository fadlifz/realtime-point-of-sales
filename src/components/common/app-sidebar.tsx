"use client";

import { Coffee, EllipsisVertical, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export default function AppSidebar() {
  const { isMobile } = useSidebar();

  return (
    <Sidebar>
      {/* 1. Header Cafe */}
      <SidebarHeader className="border-b pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-3 font-semibold">
                <div className="bg-teal-500 flex h-8 w-8 items-center justify-center rounded-md text-white">
                  <Coffee className="size-4" />
                </div>
                <span>WPU Cafe</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 2. Menu User (Langsung di bawah Header agar tidak turun ke bawah) */}
      <div className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full hover:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="" />
                    <AvatarFallback className="rounded-lg bg-teal-500 text-white">
                      F
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      Fadli Faturzaman
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      Admin
                    </span>
                  </div>
                  <EllipsisVertical className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-(--sidebar-width) min-w-56 rounded-lg flex flex-col gap-1 shadow-md border bg-popover"
                // INI KUNCINYA: Paksa muncul di bawah profil, bukan di samping
                side="bottom"
                align="start"
                sideOffset={4}
              >
                {/* Bagian Profil di dalam Dropdown */}
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-teal-500 text-white">
                        F
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-semibold">
                        Fadli Faturzaman
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        Admin
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Tombol Logout di bawahnya */}
                <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-red-500 focus:bg-red-50 focus:text-red-600">
                  <LogOut className="size-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
