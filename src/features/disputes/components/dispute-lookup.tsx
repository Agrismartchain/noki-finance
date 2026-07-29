"use client";

import { Alert, Button, Field, Inline, Input, Stack } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

export interface DisputeLookupProps {
  labels: {
    label: string;
    button: string;
    notFoundHint: string;
    gapNotice: string;
  };
}

/**
 * Disputes have no list or report endpoint (verified) -- the only way to
 * reach one is a known id. This is a plain client-side navigation, not a
 * mutation: it never calls the API itself, it just routes to the detail
 * page, which performs the real GET /v1/finance/disputes/{id} lookup and
 * surfaces a NokiApiError (e.g. not found) through the normal error state.
 */
export function DisputeLookup({ labels }: DisputeLookupProps) {
  const router = useRouter();
  const [id, setId] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = id.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/disputes/${trimmed}`);
  }

  return (
    <Stack gap="md">
      <Alert tone="info">{labels.gapNotice}</Alert>
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="sm">
          <Inline gap="sm">
            <Field id="dispute-lookup-id" label={labels.label}>
              <Input value={id} onChange={(event) => setId(event.target.value)} />
            </Field>
            <Button type="submit" variant="primary" disabled={id.trim().length === 0}>
              {labels.button}
            </Button>
          </Inline>
          <p>{labels.notFoundHint}</p>
        </Stack>
      </form>
    </Stack>
  );
}
