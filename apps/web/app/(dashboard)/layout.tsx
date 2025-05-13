"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { Command, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { NavUser } from "@/components/nav-user";
import Link from "next/link";
import { siteConfig } from "@/siteConfig";
import { JaasMeetingWrapper } from "@/components/jaas-meeting-wrapper";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { theme, setTheme } = useTheme();

  return (
    <SidebarProvider>
      <SidebarInset className="flex flex-col w-full">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 justify-between">
          <div className="">
            <Link
              href="/"
              className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Command className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{siteConfig.title}</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2 px-4">
            <Button
              size={"icon"}
              variant="ghost"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <SidebarTrigger className="-ml-1" />
            {/* <Separator orientation="vertical" className="mr-2 h-4" /> */}
          </div>
        </header>
        <div className="h-full w-full">
          <div className=""></div>
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel defaultSize={75} minSize={50}>
              {children}
            </ResizablePanel>
            <ResizableHandle withHandle className="opacity-0 hover:opacity-100 transition-opacity z-60 relative" />
            <ResizablePanel defaultSize={25} minSize={15} maxSize={45}>
              <footer className="flex h-full [&>div]:w-full">
                <JaasMeetingWrapper />
              </footer>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SidebarInset>
      <AppSidebar />
    </SidebarProvider>
  );
}
