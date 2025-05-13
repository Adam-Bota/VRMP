"use client";

import React, { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { useAuth } from "@/components/auth-provider";
import { useRouter, usePathname } from "next/navigation";

export default function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return  children;
}
