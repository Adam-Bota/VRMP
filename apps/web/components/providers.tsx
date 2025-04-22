"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  ThemeProvider,
} from "next-themes";
import { AuthProvider } from "@/components/auth-provider";
import { ConfirmProvider } from "@/providers/confirm-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </ConfirmProvider>
    </AuthProvider>
  );
}
