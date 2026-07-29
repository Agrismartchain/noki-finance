"use client";

import { Alert, Button, Field, FormActions, Input, Select, Stack, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { createFeeAssessmentAction } from "../server/actions";
import type { CreateFeeAssessmentInput } from "../server/client";

const FEE_ASSESSMENT_TYPES: CreateFeeAssessmentInput["type"][] = ["CONFIRMATION", "FULFILLMENT", "DELIVERY", "RETURN", "CANCELLATION", "ADJUSTMENT"];

export interface FeeAssessmentCreateFormProps {
  labels: {
    obligationId: string;
    obligationIdRequired: string;
    type: string;
    serviceCode: string;
    percentageBase: string;
    submit: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * AssessFinancialObligationFeeDto carries no scope fields -- organizationId
 * and countryId are inferred server-side from the referenced obligation, so
 * this form only ever collects obligationId/type/serviceCode/percentageBase.
 * The user is expected to paste an obligation id they already know (e.g.
 * copied from an obligation's detail page), mirroring DisputeCreateForm's
 * obligationId-paste pattern.
 */
export function FeeAssessmentCreateForm({ labels }: FeeAssessmentCreateFormProps) {
  const router = useRouter();
  const [obligationId, setObligationId] = useState("");
  const [type, setType] = useState<CreateFeeAssessmentInput["type"]>("CONFIRMATION");
  const [serviceCode, setServiceCode] = useState("");
  const [percentageBase, setPercentageBase] = useState("");
  const [pending, setPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const typeOptions: SelectOption[] = FEE_ASSESSMENT_TYPES.map((value) => ({ id: value, label: value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    if (!obligationId.trim()) {
      setValidationError(labels.obligationIdRequired);
      return;
    }
    setValidationError(null);
    setPending(true);
    setError(null);

    const result = await createFeeAssessmentAction(
      { obligationId: obligationId.trim(), type, serviceCode: serviceCode.trim() || undefined, percentageBase: percentageBase.trim() || undefined },
      idempotencyKey,
    );

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    router.push(`/fees/assessments/${result.feeAssessment.id}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Field id="fee-assessment-obligation-id" label={labels.obligationId}>
          <Input value={obligationId} onChange={(event) => setObligationId(event.target.value)} disabled={pending} />
        </Field>
        <Field id="fee-assessment-type" label={labels.type}>
          <Select options={typeOptions} selectedKey={type} onSelectionChange={(key) => setType(key as CreateFeeAssessmentInput["type"])} />
        </Field>
        <Field id="fee-assessment-service-code" label={labels.serviceCode}>
          <Input value={serviceCode} onChange={(event) => setServiceCode(event.target.value)} disabled={pending} />
        </Field>
        <Field id="fee-assessment-percentage-base" label={labels.percentageBase}>
          <Input value={percentageBase} onChange={(event) => setPercentageBase(event.target.value)} disabled={pending} />
        </Field>

        {validationError ? <Alert tone="warning">{validationError}</Alert> : null}
        {error ? (
          <Alert tone="danger">
            {labels.genericError}
            {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
          </Alert>
        ) : null}

        <FormActions align="end">
          <Button type="submit" variant="primary" loading={pending} disabled={pending}>
            {labels.submit}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}
