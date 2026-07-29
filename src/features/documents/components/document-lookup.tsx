"use client";

import { Button, Field, Inline, Input } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

export interface DocumentLookupProps {
  label: string;
  buttonLabel: string;
}

/**
 * Bounded ID lookup -- the only way to reach a STATEMENT or CREDIT_NOTE document, since
 * no list/report endpoint exists for either (only reportType="invoices" exists, and only
 * covers documentType=INVOICE). Navigates client-side; the actual GET
 * /v1/finance/documents/{id} call happens server-side on the destination page.
 */
export function DocumentLookup({ label, buttonLabel }: DocumentLookupProps) {
  const router = useRouter();
  const [id, setId] = useState("");

  function handleLookup() {
    const trimmed = id.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/documents/${trimmed}`);
  }

  return (
    <Inline gap="sm" align="end">
      <Field id="document-lookup-id" label={label}>
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
