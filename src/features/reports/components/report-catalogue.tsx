"use client";

import { Card, CardContent, CardHeader, CardTitle, Grid } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";
import type { KeyboardEvent } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";

import { buildReportListSearchParams, parseReportListFilters, REPORT_TYPES, type ReportType } from "../server/list-query";

export interface ReportCatalogueProps {
  ariaLabel: string;
  typeLabel: string;
  typeLabels: Record<ReportType, string>;
  descriptions: Record<ReportType, string>;
}

/** Grid of the 10 governed report types. Selecting one sets `?report=<type>` in the URL, which drives the filters/preview/export sections rendered below by the page. */
export function ReportCatalogue({ ariaLabel, typeLabel, typeLabels, descriptions }: ReportCatalogueProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseReportListFilters(searchParams);

  function selectReport(reportType: ReportType) {
    const params = buildReportListSearchParams({ ...filters, reportType, page: 1 });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, reportType: ReportType) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectReport(reportType);
    }
  }

  return (
    <>
      <h2>{typeLabel}</h2>
      <Grid columns={2} gap="md" role="list" aria-label={ariaLabel}>
        {REPORT_TYPES.map((type) => (
          <Card
            key={type}
            variant="interactive"
            role="button"
            tabIndex={0}
            aria-pressed={filters.reportType === type}
            selected={filters.reportType === type}
            onClick={() => selectReport(type)}
            onKeyDown={(event) => handleKeyDown(event, type)}
          >
            <CardHeader>
              <CardTitle>{typeLabels[type]}</CardTitle>
            </CardHeader>
            <CardContent>{descriptions[type]}</CardContent>
          </Card>
        ))}
      </Grid>
    </>
  );
}
