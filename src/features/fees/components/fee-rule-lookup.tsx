"use client";

import { Button, Field, Inline, Input } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

export interface FeeRuleLookupProps {
  labels: {
    label: string;
    button: string;
    notFoundHint: string;
  };
}

/**
 * There is no GET list endpoint for fee rules (verified) -- only GET by id
 * and POST exist. This bounded lookup is the only way to reach a specific
 * fee rule's detail view without already knowing its id.
 */
export function FeeRuleLookup({ labels }: FeeRuleLookupProps) {
  const router = useRouter();
  const [id, setId] = useState("");

  function handleSubmit() {
    const trimmed = id.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/fees/rules/${trimmed}`);
  }

  return (
    <Inline gap="sm" align="end">
      <Field id="fee-rule-lookup-id" label={labels.label} description={labels.notFoundHint}>
        <Input
          value={id}
          onChange={(event) => setId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
      </Field>
      <Button variant="primary" onClick={handleSubmit}>
        {labels.button}
      </Button>
    </Inline>
  );
}
