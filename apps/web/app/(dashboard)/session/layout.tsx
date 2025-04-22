"use client";

import React, { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { useAuth } from "@/components/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

export default function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { doc, isLoading, authStateReady, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sessionId = pathname?.split('/')[2]; // Extract sessionId from URL path

  return (
    <SidebarProvider className="flex flex-col">
      <div className="flex flex-1">
                <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={80} minSize={50} maxSize={400}>
            <div className="p-4 flex flex-col gap-4">
              {children}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle={true} />
          <ResizablePanel defaultSize={20} minSize={15} className="sticky top-0">
            <AppSidebar />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </SidebarProvider>
  );
}
