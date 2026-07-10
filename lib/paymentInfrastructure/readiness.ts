import type {
  Channel,
  SendPaymentCommandParams,
} from "@nervosnetwork/fiber-js";
import { diagnosePaymentError } from "./diagnostics";
import type {
  ChannelCapacitySummary,
  PaymentDiagnostic,
  PaymentDiagnosticCode,
  PaymentNodeStatus,
  PaymentReadinessResult,
  PaymentRequest,
} from "./types";

export interface PaymentClient {
  sendPayment(params: SendPaymentCommandParams): Promise<unknown>;
}

export interface LocalReadinessInput {
  nodeStatus: PaymentNodeStatus;
  peerConnected: boolean;
  channels: Channel[] | null;
  request: PaymentRequest;
}

export interface CheckPaymentReadinessInput extends LocalReadinessInput {
  fiber: PaymentClient | null;
}

function isUsableChannel(channel: Channel): boolean {
  const stateName = channel.state.state_name.toLowerCase();

  return (
    channel.enabled &&
    (stateName.includes("ready") || stateName.includes("normal"))
  );
}

export function summarizeUsableChannels(
  channels: Channel[] | null,
): ChannelCapacitySummary {
  if (channels === null) {
    return {
      channelsKnown: false,
      usableChannelCount: 0,
      outboundCapacity: 0n,
      inboundCapacity: 0n,
    };
  }

  return channels.reduce<ChannelCapacitySummary>(
    (summary, channel) => {
      if (!isUsableChannel(channel)) {
        return summary;
      }

      return {
        channelsKnown: true,
        usableChannelCount: summary.usableChannelCount + 1,
        outboundCapacity:
          summary.outboundCapacity + BigInt(channel.local_balance),
        inboundCapacity:
          summary.inboundCapacity + BigInt(channel.remote_balance),
      };
    },
    {
      channelsKnown: true,
      usableChannelCount: 0,
      outboundCapacity: 0n,
      inboundCapacity: 0n,
    },
  );
}

function prerequisiteDiagnostic(
  code: PaymentDiagnosticCode,
  technicalDetail: string,
): PaymentDiagnostic {
  return {
    code,
    severity: "error",
    recoverable: true,
    messageKey: `paymentsPage.diagnostics.${code}`,
    technicalDetail,
  };
}

function readinessResult(
  status: PaymentReadinessResult["status"],
  summary: ChannelCapacitySummary,
  diagnostic?: PaymentDiagnostic,
): PaymentReadinessResult {
  return {
    status,
    checkedAt: Date.now(),
    summary,
    diagnostic,
  };
}

export function assessLocalReadiness(
  input: LocalReadinessInput,
): PaymentReadinessResult {
  const summary = summarizeUsableChannels(input.channels);

  if (input.nodeStatus !== "running") {
    return readinessResult(
      "blocked",
      summary,
      prerequisiteDiagnostic(
        "node_not_running",
        `Fiber node status is ${input.nodeStatus}.`,
      ),
    );
  }

  if (!input.peerConnected) {
    return readinessResult(
      "blocked",
      summary,
      prerequisiteDiagnostic(
        "peer_disconnected",
        "The default Fiber peer is disconnected.",
      ),
    );
  }

  if (summary.channelsKnown && summary.usableChannelCount === 0) {
    return readinessResult(
      "blocked",
      summary,
      prerequisiteDiagnostic(
        "no_usable_channel",
        "No enabled Ready or Normal channel is available.",
      ),
    );
  }

  if (
    input.request.mode === "keysend" &&
    summary.channelsKnown &&
    BigInt(input.request.amount) > summary.outboundCapacity
  ) {
    return readinessResult(
      "blocked",
      summary,
      prerequisiteDiagnostic(
        "insufficient_outbound_capacity",
        `Known outbound capacity ${summary.outboundCapacity} is below requested amount ${BigInt(input.request.amount)}.`,
      ),
    );
  }

  return readinessResult("warning", summary);
}

export async function checkPaymentReadiness(
  input: CheckPaymentReadinessInput,
): Promise<PaymentReadinessResult> {
  const localResult = assessLocalReadiness(input);

  if (localResult.status === "blocked") {
    return localResult;
  }

  if (!input.fiber) {
    return readinessResult(
      "blocked",
      localResult.summary,
      prerequisiteDiagnostic(
        "node_not_running",
        "The Fiber client is not available.",
      ),
    );
  }

  const params: SendPaymentCommandParams =
    input.request.mode === "invoice"
      ? {
          invoice: input.request.invoice,
          allow_self_payment: true,
          dry_run: true,
        }
      : {
          target_pubkey: input.request.targetPubkey,
          amount: input.request.amount,
          keysend: true,
          dry_run: true,
        };

  try {
    await input.fiber.sendPayment(params);
    return readinessResult("ready", localResult.summary);
  } catch (error) {
    return readinessResult(
      "blocked",
      localResult.summary,
      diagnosePaymentError(error),
    );
  }
}
