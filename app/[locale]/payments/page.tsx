"use client";

import React from "react";
import { useCallback, useEffect, useState } from "react";
import type {
  Channel,
  GetPaymentCommandResult,
} from "@nervosnetwork/fiber-js";
import ConnectWallet from "@/components/ConnectWallet";
import InvoiceScanner from "@/components/InvoiceScanner";
import Navigation from "@/components/Navigation";
import { ckbToShannons, shannonsToDisplay } from "@/lib/fiberConfig";
import { useFiber } from "@/lib/fiberContext";
import { useI18n } from "@/lib/i18n/useI18n";
import {
  diagnosePaymentError,
  usePaymentReadiness,
  type PaymentNodeStatus,
  type PaymentReadinessResult,
  type PaymentRequest,
} from "@/lib/paymentInfrastructure";
import {
  getRecentPayments,
  paymentItemFromResult,
  saveRecentPayment,
  type RecentPaymentItem,
} from "@/lib/recentActivity";
import { truncateAddress } from "@/utils/stringUtils";

const paymentStatusColors: Record<string, string> = {
  Created: "bg-blue-500/20 text-blue-400",
  Inflight: "bg-yellow-500/20 text-yellow-400",
  Success: "bg-green-500/20 text-green-400",
  Failed: "bg-red-500/20 text-red-400",
};

export default function PaymentsPage() {
  const { fiber, status, defaultPeerConnected } = useFiber();
  const { t } = useI18n();
  const [tab, setTab] = useState<"send" | "status">("send");
  const [recentPayments, setRecentPayments] = useState<RecentPaymentItem[]>([]);
  const [channels, setChannels] = useState<Channel[] | null>(null);

  useEffect(() => {
    setRecentPayments(getRecentPayments());
  }, []);

  const refreshRecentPayments = useCallback(() => {
    setRecentPayments(getRecentPayments());
  }, []);

  const tabLabels = {
    send: t("paymentsPage.send"),
    status: t("paymentsPage.status"),
  } as const;

  useEffect(() => {
    if (
      status !== "running" ||
      !fiber ||
      typeof fiber.listChannels !== "function"
    ) {
      setChannels(null);
      return;
    }

    let cancelled = false;

    void fiber
      .listChannels({ include_closed: true })
      .then((result) => {
        if (!cancelled) setChannels(result.channels);
      })
      .catch(() => {
        if (!cancelled) setChannels(null);
      });

    return () => {
      cancelled = true;
    };
  }, [fiber, status]);

  const prerequisiteMessage =
    status !== "running"
      ? t("paymentsPage.startNodeFirst")
      : !defaultPeerConnected
        ? t("paymentsPage.defaultPeerRequired")
        : null;

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="mobile-page-shell max-w-6xl mx-auto px-4 py-4 md:py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">{t("paymentsPage.title")}</h1>
          <ConnectWallet />
        </div>

        {prerequisiteMessage ? (
          <div
            className="mb-6 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200"
            role="status"
          >
            {prerequisiteMessage}
          </div>
        ) : null}

        <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:gap-1">
          {(["send", "status"] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`w-full rounded-lg px-4 py-3 text-sm transition-colors sm:w-auto sm:py-2 ${
                tab === tabKey
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {tabLabels[tabKey]}
            </button>
          ))}
        </div>

        {tab === "send" && (
          <SendPayment
            channels={channels}
            fiber={fiber}
            nodeStatus={status}
            peerConnected={defaultPeerConnected}
            onRecentPaymentsChange={refreshRecentPayments}
          />
        )}
        {tab === "status" && (
          <PaymentStatus
            fiber={fiber}
            enabled={status === "running" && defaultPeerConnected}
            onRecentPaymentsChange={refreshRecentPayments}
          />
        )}

        <RecentPaymentsCard items={recentPayments} />
      </div>
    </div>
  );
}

function SendPayment({
  channels,
  fiber,
  nodeStatus,
  peerConnected,
  onRecentPaymentsChange,
}: {
  channels: Channel[] | null;
  fiber: any | null;
  nodeStatus: PaymentNodeStatus;
  peerConnected: boolean;
  onRecentPaymentsChange: () => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"invoice" | "keysend">("invoice");
  const [invoice, setInvoice] = useState("");
  const [targetPubkey, setTargetPubkey] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<GetPaymentCommandResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("");
  const {
    check,
    checking,
    invalidate: invalidateReadiness,
    result: readinessResult,
  } = usePaymentReadiness({
    channels,
    fiber,
    nodeStatus,
    peerConnected,
  });

  const buildPaymentRequest = useCallback((): PaymentRequest | null => {
    if (mode === "invoice") {
      const trimmedInvoice = invoice.trim();
      if (!trimmedInvoice) {
        setError(t("paymentsPage.enterInvoiceError"));
        return null;
      }

      return { mode: "invoice", invoice: trimmedInvoice };
    }

    const trimmedTarget = targetPubkey.trim();
    if (!trimmedTarget || !amount) {
      setError(t("paymentsPage.fillAllFieldsError"));
      return null;
    }

    let paymentAmount: `0x${string}`;
    try {
      paymentAmount = ckbToShannons(amount);
    } catch {
      setError(t("paymentsPage.invalidAmountError"));
      return null;
    }

    if (BigInt(paymentAmount) === 0n) {
      setError(t("paymentsPage.amountMustBePositiveError"));
      return null;
    }

    return {
      mode: "keysend",
      targetPubkey: trimmedTarget,
      amount: paymentAmount,
    };
  }, [amount, invoice, mode, t, targetPubkey]);

  const handleCheckReadiness = useCallback(async () => {
    setError("");
    const request = buildPaymentRequest();
    if (!request) return;
    await check(request);
  }, [buildPaymentRequest, check]);

  const handleSend = useCallback(async () => {
    const request = buildPaymentRequest();
    if (!request || !fiber) return;

    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const readiness = await check(request);
      if (readiness.status === "blocked") {
        setSubmitting(false);
        return;
      }

      let payResult: GetPaymentCommandResult;
      if (request.mode === "invoice") {
        payResult = await fiber.sendPayment({
          invoice: request.invoice,
          allow_self_payment: true,
        });
        saveRecentPayment(
          paymentItemFromResult(payResult, {
            mode: "invoice",
            invoice: request.invoice,
          }),
        );
      } else {
        payResult = await fiber.sendPayment({
          target_pubkey: request.targetPubkey,
          amount: request.amount,
          keysend: true,
        });
        saveRecentPayment(
          paymentItemFromResult(payResult, {
            mode: "keysend",
            targetPubkey: request.targetPubkey,
            amount,
          }),
        );
      }

      setResult(payResult);
      onRecentPaymentsChange();

      if (payResult.status === "Created" || payResult.status === "Inflight") {
        let latestResult = payResult;

        for (let attempt = 0; attempt < 8; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          latestResult = await fiber.getPayment({
            payment_hash: payResult.payment_hash,
          });
          setResult(latestResult);
          saveRecentPayment(
            paymentItemFromResult(latestResult, {
              mode: request.mode,
              invoice:
                request.mode === "invoice" ? request.invoice : undefined,
              targetPubkey:
                request.mode === "keysend"
                  ? request.targetPubkey
                  : undefined,
              amount: request.mode === "keysend" ? amount : undefined,
            }),
          );
          onRecentPaymentsChange();
          if (
            latestResult.status === "Success" ||
            latestResult.status === "Failed"
          ) {
            break;
          }
        }
      }
    } catch (e) {
      const diagnostic = diagnosePaymentError(e);
      setError(t(diagnostic.messageKey));
    }

    setSubmitting(false);
  }, [
    amount,
    buildPaymentRequest,
    check,
    fiber,
    onRecentPaymentsChange,
    t,
  ]);

  const paymentActionsEnabled =
    Boolean(fiber) && nodeStatus === "running" && peerConnected;

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
      <h2 className="text-lg font-semibold mb-4">
        {t("paymentsPage.sendTitle")}
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:gap-1">
        <button
          aria-pressed={mode === "invoice"}
          onClick={() => {
            setMode("invoice");
            setError("");
            invalidateReadiness();
          }}
          className={`w-full rounded-lg px-3 py-3 text-xs transition-colors sm:w-auto sm:py-1.5 ${
            mode === "invoice"
              ? "bg-blue-600 text-white"
              : "bg-white/5 text-white/50"
          }`}
        >
          {t("paymentsPage.payInvoice")}
        </button>
        <button
          aria-pressed={mode === "keysend"}
          onClick={() => {
            setMode("keysend");
            setError("");
            invalidateReadiness();
          }}
          className={`w-full rounded-lg px-3 py-3 text-xs transition-colors sm:w-auto sm:py-1.5 ${
            mode === "keysend"
              ? "bg-blue-600 text-white"
              : "bg-white/5 text-white/50"
          }`}
        >
          {t("paymentsPage.keysend")}
        </button>
      </div>

      <div className="space-y-4">
        {mode === "invoice" ? (
          <div>
            <label
              htmlFor="payment-invoice"
              className="block text-sm text-white/60 mb-1"
            >
              {t("paymentsPage.invoiceStringLabel")}
            </label>
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setShowScanner((current) => !current)}
                className="w-full rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15 sm:w-auto sm:px-3 sm:py-2 sm:text-xs"
              >
                {t("paymentsPage.scanInvoice")}
              </button>
            </div>
            <textarea
              id="payment-invoice"
              value={invoice}
              onChange={(e) => {
                setInvoice(e.target.value);
                setError("");
                setScannerMessage("");
                invalidateReadiness();
              }}
              placeholder={t("paymentsPage.invoiceStringPlaceholder")}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono focus:outline-none focus:border-blue-500 resize-none"
            />
            {scannerMessage ? (
              <div className="mt-2 text-sm text-green-400">{scannerMessage}</div>
            ) : null}
            {showScanner ? (
              <div className="mt-3">
                <InvoiceScanner
                  onDetected={(value) => {
                    setInvoice(value);
                    setError("");
                    setScannerMessage(t("paymentsPage.scannerReady"));
                    setShowScanner(false);
                    invalidateReadiness();
                  }}
                  onClose={() => setShowScanner(false)}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div>
              <label
                htmlFor="payment-target-pubkey"
                className="block text-sm text-white/60 mb-1"
              >
                {t("paymentsPage.targetPubkeyLabel")}
              </label>
              <input
                id="payment-target-pubkey"
                type="text"
                value={targetPubkey}
                onChange={(e) => {
                  setTargetPubkey(e.target.value);
                  setError("");
                  invalidateReadiness();
                }}
                placeholder={t("paymentsPage.targetPubkeyPlaceholder")}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="payment-amount"
                className="block text-sm text-white/60 mb-1"
              >
                {t("paymentsPage.amountLabel")}
              </label>
              <input
                id="payment-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                  invalidateReadiness();
                }}
                placeholder={t("paymentsPage.amountPlaceholder")}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </>
        )}

        {readinessResult ? (
          <PaymentReadinessPanel result={readinessResult} />
        ) : null}

        {error && (
          <div
            className="text-sm p-3 rounded-lg bg-red-500/10 text-red-400"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:flex">
          <button
            type="button"
            onClick={handleCheckReadiness}
            disabled={!paymentActionsEnabled || checking || submitting}
            className="min-h-11 w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {checking
              ? t("paymentsPage.checkingReadiness")
              : t("paymentsPage.checkReadiness")}
          </button>
          <button
            onClick={handleSend}
            disabled={!paymentActionsEnabled || submitting || checking}
            className="min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {submitting
              ? t("paymentsPage.sending")
              : t("paymentsPage.sendTitle")}
          </button>
        </div>

        {result && <PaymentResultCard result={result} />}
      </div>
    </div>
  );
}

function PaymentReadinessPanel({
  result,
}: {
  result: PaymentReadinessResult;
}) {
  const { t } = useI18n();
  const tone = {
    ready: "border-green-500/25 bg-green-500/10 text-green-200",
    warning: "border-yellow-500/25 bg-yellow-500/10 text-yellow-200",
    blocked: "border-red-500/25 bg-red-500/10 text-red-200",
  }[result.status];
  const statusLabel = {
    ready: t("paymentsPage.readinessReady"),
    warning: t("paymentsPage.readinessWarning"),
    blocked: t("paymentsPage.readinessBlocked"),
  }[result.status];

  return (
    <div
      aria-live="polite"
      className={`rounded-lg border p-4 text-sm ${tone}`}
      role="status"
    >
      <div className="font-medium">{statusLabel}</div>
      {result.diagnostic ? (
        <div className="mt-1 text-sm">
          {t(result.diagnostic.messageKey)}
        </div>
      ) : null}
      {result.status === "ready" ? (
        <div className="mt-1 text-xs text-white/55">
          {t("paymentsPage.readinessNotGuarantee")}
        </div>
      ) : null}
      {result.diagnostic?.technicalDetail ? (
        <details className="mt-2 text-xs text-white/55">
          <summary className="cursor-pointer select-none">
            {t("paymentsPage.technicalDetails")}
          </summary>
          <div className="mt-1 break-all font-mono">
            {result.diagnostic.technicalDetail}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function PaymentStatus({
  enabled,
  fiber,
  onRecentPaymentsChange,
}: {
  enabled: boolean;
  fiber: any | null;
  onRecentPaymentsChange: () => void;
}) {
  const { t } = useI18n();
  const [paymentHash, setPaymentHash] = useState("");
  const [result, setResult] = useState<GetPaymentCommandResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = useCallback(async () => {
    if (!paymentHash) {
      setError(t("paymentsPage.enterPaymentHashError"));
      return;
    }
    if (!fiber || !enabled) return;

    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const payResult: GetPaymentCommandResult = await fiber.getPayment({
        payment_hash: paymentHash.trim() as `0x${string}`,
      });
      setResult(payResult);
      saveRecentPayment(
        paymentItemFromResult(payResult, {
          mode: "lookup",
        }),
      );
      onRecentPaymentsChange();
    } catch (e: any) {
      setError(e?.message || String(e));
    }

    setSubmitting(false);
  }, [enabled, fiber, onRecentPaymentsChange, paymentHash, t]);

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
      <h2 className="text-lg font-semibold mb-4">
        {t("paymentsPage.statusTitle")}
      </h2>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="payment-hash"
            className="block text-sm text-white/60 mb-1"
          >
            {t("paymentsPage.paymentHashLabel")}
          </label>
          <input
            id="payment-hash"
            type="text"
            value={paymentHash}
            onChange={(e) => setPaymentHash(e.target.value)}
            placeholder={t("paymentsPage.paymentHashPlaceholder")}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="text-sm p-3 rounded-lg bg-red-500/10 text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleLookup}
          disabled={!enabled || submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:py-2"
        >
          {submitting ? t("paymentsPage.checking") : t("paymentsPage.status")}
        </button>

        {result && <PaymentResultCard result={result} />}
      </div>
    </div>
  );
}

function PaymentResultCard({ result }: { result: GetPaymentCommandResult }) {
  const { t } = useI18n();
  const statusLabels: Record<string, string> = {
    Created: t("paymentsPage.statusCreated"),
    Inflight: t("paymentsPage.statusInflight"),
    Success: t("paymentsPage.statusSuccess"),
    Failed: t("paymentsPage.statusFailed"),
  };

  return (
    <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            paymentStatusColors[result.status] || "bg-white/10 text-white/60"
          }`}
        >
          {statusLabels[result.status] || result.status}
        </span>
        <span className="text-xs text-white/40">
          {t("paymentsPage.feeLabel")}: {shannonsToDisplay(result.fee)} CKB
        </span>
      </div>
      <div className="text-xs font-mono text-white/60 break-all">
        {t("paymentsPage.hashLabel")}: {result.payment_hash}
      </div>
      {result.failed_error && (
        <div className="text-xs text-red-400">
          {t("paymentsPage.errorLabel")}: {result.failed_error}
        </div>
      )}
    </div>
  );
}

function RecentPaymentsCard({ items }: { items: RecentPaymentItem[] }) {
  const { locale, t } = useI18n();
  const statusLabels: Record<string, string> = {
    Created: t("paymentsPage.statusCreated"),
    Inflight: t("paymentsPage.statusInflight"),
    Success: t("paymentsPage.statusSuccess"),
    Failed: t("paymentsPage.statusFailed"),
  };
  const modeLabels: Record<RecentPaymentItem["mode"], string> = {
    invoice: t("paymentsPage.modeInvoice"),
    keysend: t("paymentsPage.modeKeysend"),
    lookup: t("paymentsPage.modeLookup"),
  };

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("paymentsPage.recent")}</h2>
        <span className="text-xs text-white/30">
          {t("paymentsPage.storedLocally")}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-white/40">
          {t("paymentsPage.noRecent")}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.paymentHash}
              className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    paymentStatusColors[item.status] || "bg-white/10 text-white/60"
                  }`}
                >
                  {statusLabels[item.status] || item.status}
                </span>
                <span className="text-xs text-white/40 uppercase">
                  {modeLabels[item.mode]}
                </span>
                <span className="text-xs text-white/30">
                  {new Date(item.updatedAt).toLocaleString(locale)}
                </span>
              </div>
              <div className="text-xs font-mono text-white/70 break-all">
                {t("paymentsPage.hashLabel")}: {item.paymentHash}
              </div>
              {item.targetPubkey && (
                <div className="text-xs text-white/50">
                  {t("paymentsPage.targetLabel")}:{" "}
                  {truncateAddress(item.targetPubkey, 12, 8)}
                </div>
              )}
              {item.amount && (
                <div className="text-xs text-white/50">
                  {t("paymentsPage.amountLabel")}: {item.amount} CKB
                </div>
              )}
              {item.invoice && (
                <div className="text-xs text-white/50 break-all">
                  {t("paymentsPage.invoiceLabel")}: {item.invoice}
                </div>
              )}
              <div className="text-xs text-white/40">
                {t("paymentsPage.feeLabel")}: {shannonsToDisplay(item.fee)} CKB
              </div>
              {item.failedError && (
                <div className="text-xs text-red-400 break-all">
                  {t("paymentsPage.errorLabel")}: {item.failedError}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
