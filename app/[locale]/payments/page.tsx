"use client";

import React from "react";
import { useCallback, useEffect, useState } from "react";
import type { GetPaymentCommandResult } from "@nervosnetwork/fiber-js";
import ConnectWallet from "@/components/ConnectWallet";
import InvoiceScanner from "@/components/InvoiceScanner";
import Navigation from "@/components/Navigation";
import { ckbToShannons, shannonsToDisplay } from "@/lib/fiberConfig";
import { useFiber } from "@/lib/fiberContext";
import { useI18n } from "@/lib/i18n/useI18n";
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

function getErrorMessage(error: unknown) {
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

function isRouteNotReadyError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("failed to build route") &&
    (message.includes("no path found") ||
      message.includes("pathfind error") ||
      (message.includes("outbound liquidity") &&
        message.includes("insufficient")))
  );
}

export default function PaymentsPage() {
  const { fiber, status, defaultPeerConnected } = useFiber();
  const { t } = useI18n();
  const [tab, setTab] = useState<"send" | "status">("send");
  const [recentPayments, setRecentPayments] = useState<RecentPaymentItem[]>([]);

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

  if (status !== "running") {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="mobile-page-shell max-w-6xl mx-auto px-4 py-4 md:py-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold">{t("paymentsPage.title")}</h1>
            <ConnectWallet />
          </div>
          <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 text-center text-white/40">
            {t("paymentsPage.startNodeFirst")}
          </div>
        </div>
      </div>
    );
  }

  if (!defaultPeerConnected) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="mobile-page-shell max-w-6xl mx-auto px-4 py-4 md:py-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold">{t("paymentsPage.title")}</h1>
            <ConnectWallet />
          </div>
          <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 text-center text-white/40">
            {t("paymentsPage.defaultPeerRequired")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="mobile-page-shell max-w-6xl mx-auto px-4 py-4 md:py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">{t("paymentsPage.title")}</h1>
          <ConnectWallet />
        </div>

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
            fiber={fiber!}
            onRecentPaymentsChange={refreshRecentPayments}
          />
        )}
        {tab === "status" && (
          <PaymentStatus
            fiber={fiber!}
            onRecentPaymentsChange={refreshRecentPayments}
          />
        )}

        <RecentPaymentsCard items={recentPayments} />
      </div>
    </div>
  );
}

function SendPayment({
  fiber,
  onRecentPaymentsChange,
}: {
  fiber: any;
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

  const handleSend = useCallback(async () => {
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      let payResult: GetPaymentCommandResult;

      if (mode === "invoice") {
        if (!invoice) {
          setError(t("paymentsPage.enterInvoiceError"));
          setSubmitting(false);
          return;
        }

        payResult = await fiber.sendPayment({
          invoice: invoice.trim(),
          allow_self_payment: true,
        });
        saveRecentPayment(
          paymentItemFromResult(payResult, {
            mode: "invoice",
            invoice: invoice.trim(),
          }),
        );
      } else {
        if (!targetPubkey || !amount) {
          setError(t("paymentsPage.fillAllFieldsError"));
          setSubmitting(false);
          return;
        }

        payResult = await fiber.sendPayment({
          target_pubkey: targetPubkey.trim(),
          amount: ckbToShannons(amount),
          keysend: true,
        });
        saveRecentPayment(
          paymentItemFromResult(payResult, {
            mode: "keysend",
            targetPubkey: targetPubkey.trim(),
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
              mode,
              invoice: mode === "invoice" ? invoice.trim() : undefined,
              targetPubkey:
                mode === "keysend" ? targetPubkey.trim() : undefined,
              amount: mode === "keysend" ? amount : undefined,
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
    } catch (e: any) {
      setError(
        isRouteNotReadyError(e)
          ? t("paymentsPage.routeNotReadyHint")
          : getErrorMessage(e),
      );
    }

    setSubmitting(false);
  }, [
    amount,
    fiber,
    invoice,
    mode,
    onRecentPaymentsChange,
    t,
    targetPubkey,
  ]);

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
      <h2 className="text-lg font-semibold mb-4">
        {t("paymentsPage.sendTitle")}
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:gap-1">
        <button
          onClick={() => setMode("invoice")}
          className={`w-full rounded-lg px-3 py-3 text-xs transition-colors sm:w-auto sm:py-1.5 ${
            mode === "invoice"
              ? "bg-blue-600 text-white"
              : "bg-white/5 text-white/50"
          }`}
        >
          {t("paymentsPage.payInvoice")}
        </button>
        <button
          onClick={() => setMode("keysend")}
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
            <label className="block text-sm text-white/60 mb-1">
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
              value={invoice}
              onChange={(e) => {
                setInvoice(e.target.value);
                setScannerMessage("");
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
                  }}
                  onClose={() => setShowScanner(false)}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm text-white/60 mb-1">
                {t("paymentsPage.targetPubkeyLabel")}
              </label>
              <input
                type="text"
                value={targetPubkey}
                onChange={(e) => setTargetPubkey(e.target.value)}
                placeholder={t("paymentsPage.targetPubkeyPlaceholder")}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">
                {t("paymentsPage.amountLabel")}
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("paymentsPage.amountPlaceholder")}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </>
        )}

        {error && (
          <div className="text-sm p-3 rounded-lg bg-red-500/10 text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:py-2"
        >
          {submitting ? t("paymentsPage.sending") : t("paymentsPage.sendTitle")}
        </button>

        {result && <PaymentResultCard result={result} />}
      </div>
    </div>
  );
}

function PaymentStatus({
  fiber,
  onRecentPaymentsChange,
}: {
  fiber: any;
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
  }, [fiber, onRecentPaymentsChange, paymentHash, t]);

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
      <h2 className="text-lg font-semibold mb-4">
        {t("paymentsPage.statusTitle")}
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1">
            {t("paymentsPage.paymentHashLabel")}
          </label>
          <input
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
          disabled={submitting}
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
