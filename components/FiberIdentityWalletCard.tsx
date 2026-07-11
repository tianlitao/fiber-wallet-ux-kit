"use client";

import React, { useEffect, useState } from "react";
import type { NodeInfoResult } from "@nervosnetwork/fiber-js";
import {
  deleteFiberIdentityWallet,
  generateFiberIdentityMnemonic,
  hasFiberIdentityWallet,
  saveFiberIdentityWallet,
  unlockFiberIdentityWallet,
} from "@/lib/fiberIdentityWallet";
import { hexToNumber, shannonsToDisplay } from "@/lib/fiberConfig";
import { useI18n } from "@/lib/i18n/useI18n";
import { truncateAddress } from "@/utils/stringUtils";

type FiberStatus = "idle" | "starting" | "running" | "error" | "stopped";
type Mode = "loading" | "empty" | "create" | "import" | "locked";
type CopyStatus = "idle" | "copied" | "failed";

type Props = {
  status: FiberStatus;
  error: string | null;
  nodeInfo: NodeInfoResult | null;
  startFiber: (fiberKey: Uint8Array) => Promise<void>;
  stopFiber: () => Promise<void>;
  refreshNodeInfo: () => Promise<void>;
};

export default function FiberIdentityWalletCard({
  status,
  error,
  nodeInfo,
  startFiber,
  stopFiber,
  refreshNodeInfo,
}: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("loading");
  const [mnemonicDraft, setMnemonicDraft] = useState("");
  const [password, setPassword] = useState("");
  const [importMnemonic, setImportMnemonic] = useState("");
  const [confirmedBackup, setConfirmedBackup] = useState(false);
  const [message, setMessage] = useState("");
  const [nodePubkeyCopyStatus, setNodePubkeyCopyStatus] =
    useState<CopyStatus>("idle");

  useEffect(() => {
    void hasFiberIdentityWallet()
      .then((exists) => setMode(exists ? "locked" : "empty"))
      .catch(() => {
        setMode("locked");
        setMessage(t("dashboard.invalidLocalWallet"));
      });
    // The initial wallet presence check should only run once.
    // Re-running it on every render would overwrite in-progress UI flows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setNodePubkeyCopyStatus("idle");
  }, [nodeInfo?.pubkey]);

  useEffect(() => {
    if (nodePubkeyCopyStatus !== "copied") return;

    const timeout = window.setTimeout(() => {
      setNodePubkeyCopyStatus("idle");
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [nodePubkeyCopyStatus]);

  const handleCreate = () => {
    setMnemonicDraft(generateFiberIdentityMnemonic());
    setPassword("");
    setConfirmedBackup(false);
    setMode("create");
    setMessage("");
  };

  const handleSaveCreatedWallet = async () => {
    try {
      await saveFiberIdentityWallet(mnemonicDraft, password);
      setMode("locked");
      setMnemonicDraft("");
      setPassword("");
      setConfirmedBackup(false);
      setMessage("");
    } catch (e: any) {
      setMessage(e?.message || String(e));
    }
  };

  const handleImport = async () => {
    try {
      await saveFiberIdentityWallet(importMnemonic, password);
      setImportMnemonic("");
      setPassword("");
      setMode("locked");
      setMessage("");
    } catch (e: any) {
      setMessage(e?.message || String(e));
    }
  };

  const handleUnlock = async () => {
    try {
      const fiberKey = await unlockFiberIdentityWallet(password);
      await startFiber(fiberKey);
      setPassword("");
      setMessage("");
    } catch (e: any) {
      setMessage(e?.message || String(e));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("dashboard.deleteWalletConfirm"))) return;

    await deleteFiberIdentityWallet();
    setMode("empty");
    setPassword("");
    setImportMnemonic("");
    setMnemonicDraft("");
    setConfirmedBackup(false);
    setMessage("");
  };

  const handleCopyNodePubkey = async () => {
    if (
      !nodeInfo?.pubkey ||
      typeof navigator === "undefined" ||
      !navigator.clipboard
    ) {
      setNodePubkeyCopyStatus("failed");
      return;
    }

    try {
      await navigator.clipboard.writeText(nodeInfo.pubkey);
      setNodePubkeyCopyStatus("copied");
    } catch {
      setNodePubkeyCopyStatus("failed");
    }
  };

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("dashboard.fiberNode")}</h2>
        {status === "running" ? (
          <div className="flex gap-2">
            <button
              onClick={refreshNodeInfo}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
            >
              {t("dashboard.refresh")}
            </button>
            <button
              onClick={stopFiber}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
            >
              {t("dashboard.stop")}
            </button>
          </div>
        ) : null}
      </div>

      {mode === "loading" ? (
        <div className="text-white/40 text-sm">{t("dashboard.loadingWallet")}</div>
      ) : null}

      {mode === "empty" && status !== "running" ? (
        <div className="space-y-4">
          <p className="text-sm text-blue-400">{t("dashboard.identityWalletHelp")}</p>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              {t("dashboard.createWallet")}
            </button>
            <button
              onClick={() => {
                setMode("import");
                setMessage("");
              }}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
            >
              {t("dashboard.importWallet")}
            </button>
          </div>
        </div>
      ) : null}

      {mode === "create" ? (
        <div className="space-y-4">
          <p className="text-sm text-yellow-300">{t("dashboard.backupWarning")}</p>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/5 p-4 text-sm">
            {mnemonicDraft.split(" ").map((word, index) => (
              <div key={`${word}-${index}`}>
                {index + 1}. {word}
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmedBackup}
              onChange={(event) => setConfirmedBackup(event.target.checked)}
            />
            <span>{t("dashboard.backupConfirmed")}</span>
          </label>
          <label className="block text-sm">
            <span className="block text-white/60 mb-1">
              {t("dashboard.localWalletPassword")}
            </span>
            <input
              aria-label={t("dashboard.localWalletPassword")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
            />
          </label>
          <div className="flex gap-3">
            <button
              onClick={handleSaveCreatedWallet}
              disabled={!confirmedBackup || password.length < 8}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {t("dashboard.saveWallet")}
            </button>
            <button
              onClick={() => setMode("empty")}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
            >
              {t("dashboard.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {mode === "import" ? (
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="block text-white/60 mb-1">
              {t("dashboard.importMnemonicLabel")}
            </span>
            <textarea
              aria-label={t("dashboard.importMnemonicLabel")}
              value={importMnemonic}
              onChange={(event) => setImportMnemonic(event.target.value)}
              className="w-full min-h-28 rounded-lg bg-white/5 border border-white/10 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-white/60 mb-1">
              {t("dashboard.localWalletPassword")}
            </span>
            <input
              aria-label={t("dashboard.localWalletPassword")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
            />
          </label>
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              {t("dashboard.importWallet")}
            </button>
            <button
              onClick={() => setMode("empty")}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
            >
              {t("dashboard.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {mode === "locked" && status !== "running" ? (
        <div className="space-y-4">
          <p className="text-sm text-white/60">{t("dashboard.lockedWalletHelp")}</p>
          <label className="block text-sm">
            <span className="block text-white/60 mb-1">
              {t("dashboard.walletPassword")}
            </span>
            <input
              aria-label={t("dashboard.walletPassword")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
            />
          </label>
          <div className="flex gap-3">
            <button
              onClick={handleUnlock}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              {t("dashboard.unlockAndStart")}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
            >
              {t("dashboard.deleteWallet")}
            </button>
          </div>
        </div>
      ) : null}

      {status === "starting" ? (
        <div className="text-yellow-400 text-sm">{t("dashboard.startingNode")}</div>
      ) : null}

      {error ? (
        <div className="text-red-400 text-sm bg-red-500/10 rounded-lg p-3 mt-4">
          {t("dashboard.errorPrefix")} {error}
        </div>
      ) : null}

      {message ? (
        <div className="text-red-400 text-sm bg-red-500/10 rounded-lg p-3 mt-4">
          {message}
        </div>
      ) : null}

      {status === "running" && nodeInfo ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard
            label={t("dashboard.nodePubkey")}
            value={truncateAddress(nodeInfo.pubkey, 12, 8)}
            actionLabel={t("dashboard.copyNodePubkey")}
            feedback={
              nodePubkeyCopyStatus === "copied"
                ? t("dashboard.nodePubkeyCopied")
                : nodePubkeyCopyStatus === "failed"
                  ? t("dashboard.nodePubkeyCopyFailed")
                  : undefined
            }
            onClick={handleCopyNodePubkey}
          />
          <InfoCard label={t("dashboard.version")} value={nodeInfo.version} />
          <InfoCard
            label={t("dashboard.channels")}
            value={hexToNumber(nodeInfo.channel_count).toString()}
          />
          <InfoCard
            label={t("dashboard.connectedPeers")}
            value={hexToNumber(nodeInfo.peers_count).toString()}
          />
          <InfoCard
            label={t("dashboard.minCkbFunding")}
            value={`${shannonsToDisplay(
              nodeInfo.open_channel_auto_accept_min_ckb_funding_amount,
            )} CKB`}
          />
        </div>
      ) : null}
    </div>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
  actionLabel?: string;
  feedback?: string;
  onClick?: () => void;
};

function InfoCard({
  label,
  value,
  actionLabel,
  feedback,
  onClick,
}: InfoCardProps) {
  const content = (
    <>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs text-white/40">{label}</span>
        {actionLabel ? (
          <span
            aria-live="polite"
            className="shrink-0 text-xs font-medium text-blue-300"
          >
            {feedback || actionLabel}
          </span>
        ) : null}
      </div>
      <div className="break-all text-left text-sm font-medium">{value}</div>
    </>
  );

  if (onClick && actionLabel) {
    return (
      <button
        type="button"
        aria-label={actionLabel}
        onClick={onClick}
        className="w-full rounded-lg bg-white/5 p-4 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-white/5 p-4">
      {content}
    </div>
  );
}
