export type PaymentDiagnosticCode =
  | "node_not_running"
  | "peer_disconnected"
  | "no_usable_channel"
  | "insufficient_outbound_capacity"
  | "route_not_found"
  | "asset_mismatch"
  | "fee_limit"
  | "timeout"
  | "invalid_request"
  | "unknown";

export interface PaymentDiagnostic {
  code: PaymentDiagnosticCode;
  severity: "warning" | "error";
  recoverable: boolean;
  messageKey: `paymentsPage.diagnostics.${PaymentDiagnosticCode}`;
  technicalDetail: string;
}

export type PaymentNodeStatus =
  | "idle"
  | "starting"
  | "running"
  | "error"
  | "stopped";

export type PaymentRequest =
  | { mode: "invoice"; invoice: string }
  | {
      mode: "keysend";
      targetPubkey: string;
      amount: `0x${string}`;
    };

export interface ChannelCapacitySummary {
  channelsKnown: boolean;
  usableChannelCount: number;
  outboundCapacity: bigint;
  inboundCapacity: bigint;
}

export interface PaymentReadinessResult {
  status: "ready" | "warning" | "blocked";
  checkedAt: number;
  summary: ChannelCapacitySummary;
  diagnostic?: PaymentDiagnostic;
}
