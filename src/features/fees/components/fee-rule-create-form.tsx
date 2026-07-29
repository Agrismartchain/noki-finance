"use client";

import { Alert, Button, Field, FormActions, Grid, Input, Select, Stack, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { createFeeRuleAction } from "../server/actions";
import type { CreateFeeRuleInput } from "../server/client";

const FEE_RULE_TYPES: CreateFeeRuleInput["type"][] = ["CONFIRMATION", "FULFILLMENT", "UPSELL", "SHIPPING", "RETURN", "CANCELLATION", "QC", "QUALITY_CONTROL"];
const FEE_RULE_SCOPE_TYPES: CreateFeeRuleInput["scopeType"][] = ["COUNTRY", "CITY", "ZONE", "SUB_ZONE"];
const FEE_RULE_CALCULATION_TYPES: CreateFeeRuleInput["calculationType"][] = ["FIXED", "PERCENTAGE"];
const FEE_RULE_SOURCE_DOMAINS = ["COMMERCE", "FOOD", "MOBILITY_TAXI", "MOBILITY_TAXI_MOTO", "COURIER", "PLATFORM", "MANUAL_ADJUSTMENT"] as const;
const FEE_RULE_COUNTERPARTY_TYPES = ["SELLER", "AFFILIATE", "RESTAURANT", "DRIVER", "COURIER", "LOGISTICS_PARTNER", "CUSTOMER", "NOKI_PLATFORM", "OTHER"] as const;
const UNSET_OPTION_ID = "__unset__";

export interface FeeRuleCreateFormProps {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  labels: {
    type: string;
    scopeType: string;
    calculationType: string;
    sourceDomain: string;
    counterpartyType: string;
    serviceCode: string;
    sellerId: string;
    cityId: string;
    zoneId: string;
    subZoneId: string;
    fixedAmount: string;
    percentageRate: string;
    percentageBase: string;
    minimumAmount: string;
    maximumAmount: string;
    priority: string;
    validFrom: string;
    validTo: string;
    submit: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * Collects every field CreateFinanceFeeRuleDto accepts. All scope-narrowing
 * fields beyond countryCode (sellerId/cityId/zoneId/subZoneId) and every
 * calculation input are optional -- the server is the sole authority on
 * validating a coherent combination (e.g. rejecting a CITY scopeType with no
 * cityId); this form never guesses that logic client-side. Enum values are
 * rendered as their raw codes (no per-value translation dict exists for
 * type/scopeType/calculationType/sourceDomain/counterpartyType anywhere in
 * this app, matching the same untranslated rendering obligations already
 * uses for its own sourceDomain/counterpartyType fields).
 */
export function FeeRuleCreateForm({ organizationId, countryId, countryCode, currencyId, labels }: FeeRuleCreateFormProps) {
  const router = useRouter();
  const [type, setType] = useState<CreateFeeRuleInput["type"]>("CONFIRMATION");
  const [scopeType, setScopeType] = useState<CreateFeeRuleInput["scopeType"]>("COUNTRY");
  const [calculationType, setCalculationType] = useState<CreateFeeRuleInput["calculationType"]>("FIXED");
  const [sourceDomain, setSourceDomain] = useState("");
  const [counterpartyType, setCounterpartyType] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [cityId, setCityId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [subZoneId, setSubZoneId] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [percentageRate, setPercentageRate] = useState("");
  const [percentageBase, setPercentageBase] = useState("");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [maximumAmount, setMaximumAmount] = useState("");
  const [priority, setPriority] = useState("0");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const typeOptions: SelectOption[] = FEE_RULE_TYPES.map((value) => ({ id: value, label: value }));
  const scopeTypeOptions: SelectOption[] = FEE_RULE_SCOPE_TYPES.map((value) => ({ id: value, label: value }));
  const calculationTypeOptions: SelectOption[] = FEE_RULE_CALCULATION_TYPES.map((value) => ({ id: value, label: value }));
  const sourceDomainOptions: SelectOption[] = [{ id: UNSET_OPTION_ID, label: labels.sourceDomain }, ...FEE_RULE_SOURCE_DOMAINS.map((value) => ({ id: value, label: value }))];
  const counterpartyTypeOptions: SelectOption[] = [{ id: UNSET_OPTION_ID, label: labels.counterpartyType }, ...FEE_RULE_COUNTERPARTY_TYPES.map((value) => ({ id: value, label: value }))];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);

    const result = await createFeeRuleAction(
      {
        organizationId,
        countryId,
        countryCode,
        currencyId,
        type,
        scopeType,
        calculationType,
        sourceDomain: sourceDomain || undefined,
        counterpartyType: counterpartyType || undefined,
        serviceCode: serviceCode.trim() || undefined,
        sellerId: sellerId.trim() || undefined,
        cityId: cityId.trim() || undefined,
        zoneId: zoneId.trim() || undefined,
        subZoneId: subZoneId.trim() || undefined,
        fixedAmount: fixedAmount.trim() || undefined,
        percentageRate: percentageRate.trim() || undefined,
        percentageBase: percentageBase.trim() || undefined,
        minimumAmount: minimumAmount.trim() || undefined,
        maximumAmount: maximumAmount.trim() || undefined,
        // priority is an integer ordering field, not a money amount -- parseInt-style
        // parsing is the sanctioned tool here, same as page-number parsing elsewhere.
        priority: priority.trim() ? Number.parseInt(priority, 10) : undefined,
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
      },
      idempotencyKey,
    );

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    router.push(`/fees/rules/${result.feeRule.id}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Grid columns={2} gap="md">
          <Field id="fee-rule-type" label={labels.type}>
            <Select options={typeOptions} selectedKey={type} onSelectionChange={(key) => setType(key as CreateFeeRuleInput["type"])} />
          </Field>
          <Field id="fee-rule-scope-type" label={labels.scopeType}>
            <Select options={scopeTypeOptions} selectedKey={scopeType} onSelectionChange={(key) => setScopeType(key as CreateFeeRuleInput["scopeType"])} />
          </Field>
          <Field id="fee-rule-calculation-type" label={labels.calculationType}>
            <Select options={calculationTypeOptions} selectedKey={calculationType} onSelectionChange={(key) => setCalculationType(key as CreateFeeRuleInput["calculationType"])} />
          </Field>
          <Field id="fee-rule-source-domain" label={labels.sourceDomain}>
            <Select options={sourceDomainOptions} selectedKey={sourceDomain || UNSET_OPTION_ID} onSelectionChange={(key) => setSourceDomain(key === UNSET_OPTION_ID ? "" : String(key))} />
          </Field>
          <Field id="fee-rule-counterparty-type" label={labels.counterpartyType}>
            <Select options={counterpartyTypeOptions} selectedKey={counterpartyType || UNSET_OPTION_ID} onSelectionChange={(key) => setCounterpartyType(key === UNSET_OPTION_ID ? "" : String(key))} />
          </Field>
          <Field id="fee-rule-service-code" label={labels.serviceCode}>
            <Input value={serviceCode} onChange={(event) => setServiceCode(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-seller-id" label={labels.sellerId}>
            <Input value={sellerId} onChange={(event) => setSellerId(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-city-id" label={labels.cityId}>
            <Input value={cityId} onChange={(event) => setCityId(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-zone-id" label={labels.zoneId}>
            <Input value={zoneId} onChange={(event) => setZoneId(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-sub-zone-id" label={labels.subZoneId}>
            <Input value={subZoneId} onChange={(event) => setSubZoneId(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-fixed-amount" label={labels.fixedAmount}>
            <Input inputMode="decimal" value={fixedAmount} onChange={(event) => setFixedAmount(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-percentage-rate" label={labels.percentageRate}>
            <Input inputMode="decimal" value={percentageRate} onChange={(event) => setPercentageRate(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-percentage-base" label={labels.percentageBase}>
            <Input value={percentageBase} onChange={(event) => setPercentageBase(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-minimum-amount" label={labels.minimumAmount}>
            <Input inputMode="decimal" value={minimumAmount} onChange={(event) => setMinimumAmount(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-maximum-amount" label={labels.maximumAmount}>
            <Input inputMode="decimal" value={maximumAmount} onChange={(event) => setMaximumAmount(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-priority" label={labels.priority}>
            <Input inputMode="numeric" value={priority} onChange={(event) => setPriority(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-valid-from" label={labels.validFrom}>
            <Input type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} disabled={pending} />
          </Field>
          <Field id="fee-rule-valid-to" label={labels.validTo}>
            <Input type="date" value={validTo} onChange={(event) => setValidTo(event.target.value)} disabled={pending} />
          </Field>
        </Grid>

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
