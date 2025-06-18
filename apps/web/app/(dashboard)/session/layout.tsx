"use client";

import React, { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@workspace/ui/components/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { Clapperboard, Command, Menu, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/siteConfig";
import { useTheme } from "next-themes";

import { JaasMeetingWrapper } from "@/components/jaas-meeting-wrapper";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";

export default function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col w-full">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 justify-between">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1">
            </SidebarTrigger>
            <div
              // href="/"
              className="flex items-center gap-2 w-full p-2 rounded-md transition-colors"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Clapperboard className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{siteConfig.title}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4">
            <Button
              size={"icon"}
              variant="ghost"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            {/* <Separator orientation="vertical" className="mr-2 h-4" /> */}
          </div>
        </header>
        <div className="h-full w-full">
          <ResizablePanelGroup direction="horizontal" className="w-full">
            <ResizablePanel defaultSize={75} minSize={30}>
              {children}
            </ResizablePanel>
            <ResizableHandle
              withHandle
              className="opacity-0 hover:opacity-100 transition-opacity z-60 relative"
            />
            <ResizablePanel defaultSize={25} minSize={15}>
              <footer className="flex h-full [&>div]:w-full">
                <JaasMeetingWrapper />
              </footer>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
