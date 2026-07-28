"use client";

import { Topbar } from "@agrismartchain/noki-design-system";

import type { SanitizedActor } from "@/lib/auth";

import { FinanceShellControls } from "./finance-shell-controls";
import styles from "./finance-topbar-view.module.css";

interface FinanceTopbarViewProps {
  actor?: SanitizedActor;
  context: string;
}

function initialsFor(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || "N";
}

export function FinanceTopbarView({ actor, context }: FinanceTopbarViewProps) {
  return (
    <Topbar
      context={context}
      actions={<FinanceShellControls showLogout />}
      user={actor ? (
        <div className={styles.identity}>
          <span className={styles.initials} aria-hidden="true">
            {initialsFor(actor.displayName)}
          </span>
          <span className={styles.identityText}>
            <span className={styles.displayName}>{actor.displayName}</span>
            {actor.email ? <span className={styles.email}>{actor.email}</span> : null}
          </span>
        </div>
      ) : undefined}
    />
  );
}
