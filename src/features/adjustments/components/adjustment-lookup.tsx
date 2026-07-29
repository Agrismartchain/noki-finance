"use client";

import { Button, Field, Inline, Input } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

export interface AdjustmentLookupProps {
  label: string;
  buttonLabel: string;
}

/** Bounded ID lookup -- adjustments have no list/report endpoint at all (verified); this is the only way to reach one besides creating it. */
export function AdjustmentLookup({ label, buttonLabel }: AdjustmentLookupProps) {
  const router = useRouter();
  const [id, setId] = useState("");

  function handleLookup() {
    const trimmed = id.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/adjustments/${trimmed}`);
  }

  return (
    <Inline gap="sm" align="end">
      <Field id="adjustment-lookup-id" label={label}>
        <Input
          value={id}
          onChange={(event) => setId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleLookup();
            }
          }}
        />
      </Field>
      <Button variant="secondary" onClick={handleLookup} disabled={!id.trim()}>
        {buttonLabel}
      </Button>
    </Inline>
  );
}
