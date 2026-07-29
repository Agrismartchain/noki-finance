"use client";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import type { ExportReportQuery, FinanceExportResponse } from "../server/client";
import { exportReportAction } from "../server/actions";
import type { ReportType } from "../server/list-query";

type ExportState = { status: "idle" } | { status: "loading" } | { status: "error"; kind: string; correlationId?: string } | { status: "success"; result: FinanceExportResponse; generatedAt: string };

export interface ReportExportPanelProps {
  reportType: ReportType;
  query: ExportReportQuery;
  labels: {
    button: string;
    title: string;
    rowCount: string;
    checksum: string;
    generatedAt: string;
    maxRows: string;
    filename: string;
    downloadCsv: string;
    generatingLabel: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * Triggers POST /v1/finance/reports/{reportType}/exports via a Server
 * Action (the browser never holds the access token), then offers a
 * client-side download of the exact `content` bytes the server returned --
 * never reparsed or reformatted, just written to a file with the server's
 * own filename.
 */
export function ReportExportPanel({ reportType, query, labels }: ReportExportPanelProps) {
  const [state, setState] = useState<ExportState>({ status: "idle" });

  async function handleExport() {
    setState({ status: "loading" });
    const result = await exportReportAction(reportType, query);
    if (result.ok) {
      setState({ status: "success", result: result.export, generatedAt: result.generatedAt });
    } else {
      setState({ status: "error", kind: result.kind, correlationId: result.correlationId });
    }
  }

  function handleDownload(result: FinanceExportResponse) {
    const blob = new Blob([result.content], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="md">
          <Button onClick={handleExport} loading={state.status === "loading"} disabled={state.status === "loading"}>
            {state.status === "loading" ? labels.generatingLabel : labels.button}
          </Button>

          {state.status === "error" ? (
            <Alert tone="danger">
              {labels.genericError}
              {state.correlationId ? ` — ${labels.correlationLabel}: ${state.correlationId}` : ""}
            </Alert>
          ) : null}

          {state.status === "success" ? (
            <Stack gap="sm">
              <DetailList>
                <DetailItem label={labels.filename} value={state.result.filename} />
                <DetailItem label={labels.rowCount} value={state.result.rowCount} />
                <DetailItem label={labels.checksum} value={state.result.checksum} />
                <DetailItem label={labels.generatedAt} value={state.generatedAt} />
                <DetailItem label={labels.maxRows} value={state.result.maxRows} />
              </DetailList>
              <Button variant="secondary" onClick={() => handleDownload(state.result)}>
                {labels.downloadCsv}
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
