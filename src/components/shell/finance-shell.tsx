"use client";

import { AppShell } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import styles from "./finance-shell.module.css";

interface FinanceShellProps {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  mobileNavigationLabel: string;
  children: React.ReactNode;
}

export function FinanceShell({ sidebar, topbar, mobileNavigationLabel, children }: FinanceShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <AppShell
      className={styles.shell}
      sidebar={sidebar}
      topbar={topbar}
      mobileSidebarOpen={mobileSidebarOpen}
      onMobileSidebarOpenChange={setMobileSidebarOpen}
      mobileNavigationLabel={mobileNavigationLabel}
    >
      {children}
    </AppShell>
  );
}
