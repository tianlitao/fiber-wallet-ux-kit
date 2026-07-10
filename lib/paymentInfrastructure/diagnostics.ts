import type {
  PaymentDiagnostic,
  PaymentDiagnosticCode,
} from "./types";

type DiagnosticRule = {
  code: Exclude<
    PaymentDiagnosticCode,
    "node_not_running" | "peer_disconnected" | "no_usable_channel" | "unknown"
  >;
  matches: (message: string) => boolean;
};

const DIAGNOSTIC_RULES: DiagnosticRule[] = [
  {
    code: "insufficient_outbound_capacity",
    matches: (message) =>
      (message.includes("outbound liquidity") ||
        message.includes("max outbound liquidity")) &&
      (message.includes("insufficient") || message.includes("required amount")),
  },
  {
    code: "asset_mismatch",
    matches: (message) =>
      message.includes("asset mismatch") ||
      message.includes("currency does not match") ||
      message.includes("udt type script mismatch"),
  },
  {
    code: "fee_limit",
    matches: (message) =>
      message.includes("fee exceeds") ||
      message.includes("max fee") ||
      message.includes("fee limit"),
  },
  {
    code: "timeout",
    matches: (message) =>
      message.includes("timeout") || message.includes("timed out"),
  },
  {
    code: "invalid_request",
    matches: (message) =>
      message.includes("invalid invoice") ||
      message.includes("invalid params") ||
      message.includes("invalid request") ||
      message.includes("malformed"),
  },
  {
    code: "route_not_found",
    matches: (message) =>
      message.includes("no path found") ||
      message.includes("pathfind error") ||
      message.includes("route not found") ||
      message.includes("failed to build route"),
  },
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return String(error);
}

export function diagnosePaymentError(error: unknown): PaymentDiagnostic {
  const technicalDetail = getErrorMessage(error);
  const normalizedMessage = technicalDetail.toLowerCase();
  const code =
    DIAGNOSTIC_RULES.find((rule) => rule.matches(normalizedMessage))?.code ??
    "unknown";

  return {
    code,
    severity: "error",
    recoverable: code !== "unknown",
    messageKey: `paymentsPage.diagnostics.${code}`,
    technicalDetail,
  };
}
