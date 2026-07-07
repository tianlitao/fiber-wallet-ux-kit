"use client";

import React from "react";
import { useCallback, useEffect, useState } from "react";
import type {
  CkbInvoice,
  GetInvoiceResult,
  InvoiceResult,
  ParseInvoiceResult,
} from "@nervosnetwork/fiber-js";
import ConnectWallet from "@/components/ConnectWallet";
import InvoiceQrCard from "@/components/InvoiceQrCard";
import InvoiceQrModal from "@/components/InvoiceQrModal";
import WalletShell from "@/components/shell/WalletShell";
import { ckbToShannons, shannonsToDisplay } from "@/lib/fiberConfig";
import { useFiber } from "@/lib/fiberContext";
import { useI18n } from "@/lib/i18n/useI18n";
import {
  getRecentInvoices,
  invoiceItemFromCreatedResult,
  invoiceItemFromLookupResult,
  invoiceItemFromParsedResult,
  saveRecentInvoice,
  type RecentInvoiceItem,
} from "@/lib/recentActivity";

const invoiceStatusColors: Record<string, string> = {
  Open: "bg-blue-500/20 text-blue-400",
  Paid: "bg-green-500/20 text-green-400",
  Received: "bg-green-500/20 text-green-400",
  Cancelled: "bg-red-500/20 text-red-400",
  Expired: "bg-yellow-500/20 text-yellow-400",
};

export default function InvoicesPage() {
  const { fiber, status, defaultPeerConnected } = useFiber();
  const { t } = useI18n();
  const [tab, setTab] = useState<"create" | "parse" | "lookup">("create");
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoiceItem[]>([]);

  useEffect(() => {
    setRecentInvoices(getRecentInvoices());
  }, []);

  const refreshRecentInvoices = useCallback(() => {
    setRecentInvoices(getRecentInvoices());
  }, []);

  const tabLabels = {
    create: t("invoicesPage.create"),
    parse: t("invoicesPage.parse"),
    lookup: t("invoicesPage.lookup"),
  } as const;

  if (status !== "running") {
    return (
      <WalletShell walletSlot={<ConnectWallet />}>
        <div className="mobile-page-shell max-w-6xl mx-auto px-0 py-0">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">{t("invoicesPage.title")}</h1>
          </div>
          <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 text-center text-white/40">
            {t("invoicesPage.startNodeFirst")}
          </div>
        </div>
      </WalletShell>
    );
  }

  if (!defaultPeerConnected) {
    return (
      <WalletShell walletSlot={<ConnectWallet />}>
        <div className="mobile-page-shell max-w-6xl mx-auto px-0 py-0">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">{t("invoicesPage.title")}</h1>
          </div>
          <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 text-center text-white/40">
            {t("invoicesPage.defaultPeerRequired")}
          </div>
        </div>
      </WalletShell>
    );
  }

  return (
    <WalletShell
      walletSlot={<ConnectWallet />}
      fab={{
        mobileLabel: t("shell.fabCreateInvoice"),
        onClick: () => setTab("create"),
      }}
    >
      <div className="mobile-page-shell max-w-6xl mx-auto px-0 py-0">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">{t("invoicesPage.title")}</h1>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2 sm:flex sm:gap-1">
          {(["create", "parse", "lookup"] as const).map((tabKey) => (
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

        {tab === "create" && (
          <CreateInvoice
            fiber={fiber!}
            onRecentInvoicesChange={refreshRecentInvoices}
          />
        )}
        {tab === "parse" && (
          <ParseInvoice
            fiber={fiber!}
            onRecentInvoicesChange={refreshRecentInvoices}
          />
        )}
        {tab === "lookup" && (
          <LookupInvoice
            fiber={fiber!}
            onRecentInvoicesChange={refreshRecentInvoices}
          />
        )}

        <RecentInvoicesCard items={recentInvoices} />
      </div>
    </WalletShell>
  );
}

function CreateInvoice({
  fiber,
  onRecentInvoicesChange,
}: {
  fiber: any;
  onRecentInvoicesChange: () => void;
}) {
  const { t } = useI18n();
  const amountInputId = "invoice-create-amount";
  const descriptionInputId = "invoice-create-description";
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [showLargeQr, setShowLargeQr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = useCallback(async () => {
    const trimmedAmount = amount.trim();

    if (!trimmedAmount) {
      setError(t("invoicesPage.amountRequiredError"));
      return;
    }

    setSubmitting(true);
    setError("");
    setResult(null);
    setShowLargeQr(false);

    try {
      const preimage = new Uint8Array(32);
      crypto.getRandomValues(preimage);
      const preimageHex = `0x${Array.from(preimage)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")}` as `0x${string}`;

      const invoiceResult: InvoiceResult = await fiber.newInvoice({
        amount: ckbToShannons(trimmedAmount),
        description: description || undefined,
        currency: "Fibt",
        payment_preimage: preimageHex,
      });

      setResult(invoiceResult);
      saveRecentInvoice(
        invoiceItemFromCreatedResult(invoiceResult, description || undefined),
      );
      onRecentInvoicesChange();
    } catch (e: any) {
      setError(e?.message || String(e));
    }

    setSubmitting(false);
  }, [amount, description, fiber, onRecentInvoicesChange, t]);

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
      <h2 className="text-lg font-semibold mb-4">
        {t("invoicesPage.createTitle")}
      </h2>
      <div className="space-y-4">
        <div>
          <label htmlFor={amountInputId} className="block text-sm text-white/60 mb-1">
            {t("invoicesPage.amountLabel")}
          </label>
          <input
            id={amountInputId}
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("invoicesPage.amountPlaceholder")}
            inputMode="decimal"
            autoComplete="off"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor={descriptionInputId} className="block text-sm text-white/60 mb-1">
            {t("invoicesPage.descriptionOptionalLabel")}
          </label>
          <input
            id={descriptionInputId}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("invoicesPage.descriptionPlaceholder")}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="text-sm p-3 rounded-lg bg-red-500/10 text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:py-2"
        >
          {submitting
            ? t("invoicesPage.creating")
            : t("invoicesPage.createTitle")}
        </button>

        {result && (
          <>
            <div className="mt-4">
              <InvoiceQrCard
                invoice={result.invoice_address}
                invoiceAddress={result.invoice_address}
                paymentHash={result.invoice.data.payment_hash}
                onShowLarge={() => setShowLargeQr(true)}
              />
            </div>
            <InvoiceQrModal
              open={showLargeQr}
              invoice={result.invoice_address}
              onClose={() => setShowLargeQr(false)}
            />
            <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-sm text-green-400 mb-2">
                {t("invoicesPage.created")}
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-white/40">
                    {t("invoicesPage.invoiceAddressLabel")}
                  </span>
                  <div
                    className="text-xs font-mono break-all bg-white/5 p-2 rounded mt-1 select-all cursor-pointer"
                    onClick={() =>
                      navigator.clipboard.writeText(result.invoice_address)
                    }
                  >
                    {result.invoice_address}
                  </div>
                  <div className="text-[10px] text-white/30 mt-1">
                    {t("invoicesPage.clickToCopy")}
                  </div>
                </div>
                <InvoiceDisplay invoice={result.invoice} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ParseInvoice({
  fiber,
  onRecentInvoicesChange,
}: {
  fiber: any;
  onRecentInvoicesChange: () => void;
}) {
  const { t } = useI18n();
  const invoiceStringInputId = "invoice-parse-string";
  const [invoiceStr, setInvoiceStr] = useState("");
  const [result, setResult] = useState<ParseInvoiceResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleParse = useCallback(async () => {
    if (!invoiceStr) {
      setError(t("invoicesPage.enterInvoiceStringError"));
      return;
    }

    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const parsed: ParseInvoiceResult = await fiber.parseInvoice({
        invoice: invoiceStr.trim(),
      });
      setResult(parsed);
      saveRecentInvoice(invoiceItemFromParsedResult(parsed, invoiceStr.trim()));
      onRecentInvoicesChange();
    } catch (e: any) {
      setError(e?.message || String(e));
    }

    setSubmitting(false);
  }, [fiber, invoiceStr, onRecentInvoicesChange, t]);

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
      <h2 className="text-lg font-semibold mb-4">
        {t("invoicesPage.parseTitle")}
      </h2>
      <div className="space-y-4">
        <div>
          <label htmlFor={invoiceStringInputId} className="block text-sm text-white/60 mb-1">
            {t("invoicesPage.invoiceStringLabel")}
          </label>
          <textarea
            id={invoiceStringInputId}
            value={invoiceStr}
            onChange={(e) => setInvoiceStr(e.target.value)}
            placeholder={t("invoicesPage.invoiceStringPlaceholder")}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {error && (
          <div className="text-sm p-3 rounded-lg bg-red-500/10 text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleParse}
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:py-2"
        >
          {submitting
            ? t("invoicesPage.parsing")
            : t("invoicesPage.parseTitle")}
        </button>

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-sm text-white/80 mb-2">
              {t("invoicesPage.parsedInvoice")}
            </div>
            <InvoiceDisplay invoice={result.invoice} />
          </div>
        )}
      </div>
    </div>
  );
}

function LookupInvoice({
  fiber,
  onRecentInvoicesChange,
}: {
  fiber: any;
  onRecentInvoicesChange: () => void;
}) {
  const { t } = useI18n();
  const paymentHashInputId = "invoice-lookup-payment-hash";
  const [paymentHash, setPaymentHash] = useState("");
  const [result, setResult] = useState<GetInvoiceResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = useCallback(async () => {
    if (!paymentHash) {
      setError(t("invoicesPage.enterPaymentHashError"));
      return;
    }

    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const invoiceResult: GetInvoiceResult = await fiber.getInvoice({
        payment_hash: paymentHash.trim() as `0x${string}`,
      });
      setResult(invoiceResult);
      saveRecentInvoice(invoiceItemFromLookupResult(invoiceResult, "lookup"));
      onRecentInvoicesChange();
    } catch (e: any) {
      setError(e?.message || String(e));
    }

    setSubmitting(false);
  }, [fiber, onRecentInvoicesChange, paymentHash, t]);

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
      <h2 className="text-lg font-semibold mb-4">
        {t("invoicesPage.lookupTitle")}
      </h2>
      <div className="space-y-4">
        <div>
          <label htmlFor={paymentHashInputId} className="block text-sm text-white/60 mb-1">
            {t("invoicesPage.paymentHashLabel")}
          </label>
          <input
            id={paymentHashInputId}
            type="text"
            value={paymentHash}
            onChange={(e) => setPaymentHash(e.target.value)}
            placeholder={t("invoicesPage.paymentHashPlaceholder")}
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
          {submitting ? t("invoicesPage.lookingUp") : t("invoicesPage.lookup")}
        </button>

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={result.status} />
            </div>
            <InvoiceDisplay invoice={result.invoice} />
          </div>
        )}
      </div>
    </div>
  );
}

function InvoiceDisplay({ invoice }: { invoice: CkbInvoice }) {
  const { t } = useI18n();
  const description = invoice.data.attrs.find(
    (attr): attr is { Description: string } => "Description" in attr,
  );

  return (
    <div className="space-y-1 text-xs">
      <div>
        <span className="text-white/40">{t("invoicesPage.currencyLabel")}:</span>{" "}
        <span className="text-white/80">{invoice.currency}</span>
      </div>
      {invoice.amount && (
        <div>
          <span className="text-white/40">{t("invoicesPage.amountLabel")}:</span>{" "}
          <span className="text-white/80">
            {shannonsToDisplay(invoice.amount)} CKB
          </span>
        </div>
      )}
      <div className="font-mono">
        <span className="text-white/40">
          {t("invoicesPage.paymentHashLabel")}:
        </span>{" "}
        <span className="text-white/80 break-all">
          {invoice.data.payment_hash}
        </span>
      </div>
      {description && (
        <div>
          <span className="text-white/40">
            {t("invoicesPage.descriptionLabel")}:
          </span>{" "}
          <span className="text-white/80">{description.Description}</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    Open: t("invoicesPage.statusOpen"),
    Paid: t("invoicesPage.statusPaid"),
    Received: t("invoicesPage.statusReceived"),
    Cancelled: t("invoicesPage.statusCancelled"),
    Expired: t("invoicesPage.statusExpired"),
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${
        invoiceStatusColors[status] || "bg-white/10 text-white/60"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

function RecentInvoicesCard({ items }: { items: RecentInvoiceItem[] }) {
  const { locale, t } = useI18n();
  const sourceLabels: Record<RecentInvoiceItem["source"], string> = {
    create: t("invoicesPage.sourceCreate"),
    lookup: t("invoicesPage.sourceLookup"),
    parse: t("invoicesPage.sourceParse"),
  };

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("invoicesPage.recent")}</h2>
        <span className="text-xs text-white/30">
          {t("invoicesPage.storedLocally")}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-white/40">
          {t("invoicesPage.noRecent")}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.paymentHash}
              className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <StatusBadge status={item.status} />
                <span className="text-xs text-white/40 uppercase">
                  {sourceLabels[item.source]}
                </span>
                <span className="text-xs text-white/30">
                  {new Date(item.updatedAt).toLocaleString(locale)}
                </span>
              </div>
              <div className="text-xs font-mono text-white/70 break-all">
                {t("invoicesPage.hashLabel")}: {item.paymentHash}
              </div>
              {item.amount && (
                <div className="text-xs text-white/50">
                  {t("invoicesPage.amountLabel")}:{" "}
                  {shannonsToDisplay(item.amount)} CKB
                </div>
              )}
              {item.description && (
                <div className="text-xs text-white/50">
                  {t("invoicesPage.descriptionLabel")}: {item.description}
                </div>
              )}
              {item.invoiceAddress && (
                <div className="text-xs text-white/50 break-all">
                  {t("invoicesPage.invoiceLabel")}: {item.invoiceAddress}
                </div>
              )}
              {item.invoice && !item.invoiceAddress && (
                <div className="text-xs text-white/50 break-all">
                  {t("invoicesPage.rawLabel")}: {item.invoice}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
