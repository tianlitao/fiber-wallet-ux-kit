"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { useFiber } from "@/lib/fiberContext";
import { ckbToShannons, shannonsToDisplay, DEFAULT_PEER_PUBKEY, DEFAULT_PEER_ADDRESS } from "@/lib/fiberConfig";
import { truncateAddress } from "@/utils/stringUtils";
import ConnectWallet from "@/components/ConnectWallet";
import WalletShell from "@/components/shell/WalletShell";
import { ccc } from "@ckb-ccc/connector-react";
import type { Channel, ListChannelsResult } from "@nervosnetwork/fiber-js";
import { useI18n } from "@/lib/i18n/useI18n";
import { JOYID_REDIRECT_SIGNING_UNSUPPORTED } from "@/lib/joyid/JoyIdRedirectCkbSigner";
import {
  clearJoyIdFundingSession,
  loadJoyIdFundingSession,
  saveJoyIdFundingSession,
} from "@/lib/joyid/fundingSession";
import {
  clearJoyIdRedirectSignResult,
  loadJoyIdRedirectSignResult,
} from "@/lib/joyid/redirect";

export default function ChannelsPage() {
  const { fiber, status, defaultPeerConnected } = useFiber();
  const signer = ccc.useSigner();
  const { t } = useI18n();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [resumeMessage, setResumeMessage] = useState("");
  const [resumeMessageTone, setResumeMessageTone] =
    useState<"error" | "info">("info");

  const refreshChannels = useCallback(async () => {
    if (!fiber) return;
    setLoading(true);
    try {
      const result: ListChannelsResult = await fiber.listChannels({ include_closed: true });
      setChannels(result.channels);
    } catch (e) {
      console.error("Failed to list channels:", e);
    }
    setLoading(false);
  }, [fiber]);

  useEffect(() => {
    if (fiber && status === "running") refreshChannels();
  }, [fiber, status, refreshChannels]);

  useEffect(() => {
    if (!fiber || status !== "running" || !signer || typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await signer.isConnected().catch(() => false);

        const session = loadJoyIdFundingSession(window.localStorage);
        const signResult = loadJoyIdRedirectSignResult(window.sessionStorage);

        if (!session || !signResult) {
          return;
        }

        const witness = signResult.tx.witnesses?.[session.userFirstIndex];
        if (!witness) {
          throw new Error(t("channelsPage.joyIdRedirectResumeFailed"));
        }

        const signedUserWitness =
          (typeof witness === "string" ? witness : ccc.hexFrom(witness)) as `0x${string}`;
        const finalWitnesses = session.originalWitnesses.map((item, index) =>
          index === session.userFirstIndex ? signedUserWitness : item,
        ) as `0x${string}`[];

        await fiber.submitSignedFundingTx({
          channel_id: session.channelId,
          signed_funding_tx: {
            ...session.unsignedFundingTx,
            witnesses: finalWitnesses,
          },
        });

        clearJoyIdFundingSession(window.localStorage);
        clearJoyIdRedirectSignResult(window.sessionStorage);

        if (cancelled) {
          return;
        }

        setResumeMessageTone("info");
        setResumeMessage(t("channelsPage.channelFundedAfterJoyIdRedirect"));
        refreshChannels();
      } catch (error) {
        clearJoyIdFundingSession(window.localStorage);
        clearJoyIdRedirectSignResult(window.sessionStorage);

        if (cancelled) {
          return;
        }

        console.error("Failed to resume JoyID funding:", error);
        setResumeMessageTone("error");
        setResumeMessage(t("channelsPage.joyIdRedirectResumeFailed"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fiber, refreshChannels, signer, status, t]);

  if (status !== "running") {
    return (
      <WalletShell walletSlot={<ConnectWallet />}>
        <div className="mx-auto px-0 py-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-semibold tracking-tight">{t("channelsPage.title")}</h1>
          </div>
          <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 text-center text-white/40">
            {t("channelsPage.startNodeFirst")}
          </div>
        </div>
      </WalletShell>
    );
  }

  if (!defaultPeerConnected) {
    return (
      <WalletShell walletSlot={<ConnectWallet />}>
        <div className="mx-auto px-0 py-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-semibold tracking-tight">{t("channelsPage.title")}</h1>
          </div>
          <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 text-center text-white/40">
            {t("channelsPage.defaultPeerRequired")}
          </div>
        </div>
      </WalletShell>
    );
  }

  return (
    <WalletShell
      walletSlot={<ConnectWallet />}
      fab={{
        mobileLabel: showOpenForm
          ? t("channelsPage.cancel")
          : t("channelsPage.openChannel"),
        onClick: () => setShowOpenForm((value) => !value),
      }}
    >
      <div className="mx-auto px-0 py-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">{t("channelsPage.title")}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOpenForm(!showOpenForm)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              {showOpenForm
                ? t("channelsPage.cancel")
                : t("channelsPage.openChannel")}
            </button>
          </div>
        </div>

        {resumeMessage && (
          <div
            className={`rounded-xl border p-4 mb-6 text-sm ${
              resumeMessageTone === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-300"
                : "bg-green-500/10 border-green-500/20 text-green-300"
            }`}
          >
            {resumeMessage}
          </div>
        )}

        {showOpenForm && (
          <OpenChannelForm
            fiber={fiber!}
            signer={signer}
            onSuccess={() => {
              setShowOpenForm(false);
              refreshChannels();
            }}
          />
        )}

        {/* Channel List */}
        <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t("channelsPage.channelList")}</h2>
            <button
              onClick={refreshChannels}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors disabled:opacity-50"
            >
              {loading
                ? t("channelsPage.loading")
                : t("channelsPage.refresh")}
            </button>
          </div>

          {channels.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">
              {t("channelsPage.noChannels")}
            </p>
          ) : (
            <div className="space-y-3">
              {channels.map((ch) => (
                <ChannelCard key={ch.channel_id} channel={ch} fiber={fiber!} onClose={refreshChannels} />
              ))}
            </div>
          )}
        </div>
      </div>
    </WalletShell>
  );
}

type FormMessageTone = "error" | "info";

function toCccDepType(depType: string): "code" | "depGroup" {
  return depType === "dep_group" ? "depGroup" : "code";
}

async function resolveFundingLockCellDeps(client: any, lockScript: {
  code_hash: `0x${string}`;
  hash_type: "type" | "data" | "data1" | "data2";
}) {
  // Well-known secp256k1-blake160 cell deps for testnet (genesis dep_group)
  const SECP256K1_CODE_HASH = "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";
  if (lockScript.code_hash === SECP256K1_CODE_HASH && lockScript.hash_type === "type") {
    return [{
      dep_type: "dep_group",
      out_point: {
        tx_hash: "0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37",
        index: "0x0",
      },
    }];
  }

  // Resolve cell deps for any CCC-known lock type (OmniLock, JoyID, PWLock, etc.)
  const candidates = [
    ccc.KnownScript.OmniLock,
    ccc.KnownScript.JoyId,
    ccc.KnownScript.PWLock,
    ccc.KnownScript.AnyoneCanPay,
    ccc.KnownScript.NostrLock,
    ccc.KnownScript.Secp256k1Blake160,
    ccc.KnownScript.Secp256k1Multisig,
    ccc.KnownScript.Secp256k1MultisigV2,
  ];

  for (const knownScript of candidates) {
    try {
      const scriptInfo = await client.getKnownScript(knownScript);
      if (
        scriptInfo.codeHash === lockScript.code_hash &&
        scriptInfo.hashType === lockScript.hash_type
      ) {
        return scriptInfo.cellDeps.map((dep: any) => ({
          dep_type: dep.cellDep.depType === "depGroup" ? "dep_group" : "code",
          out_point: {
            tx_hash: dep.cellDep.outPoint.txHash,
            index: `0x${Number(dep.cellDep.outPoint.index).toString(16)}`,
          },
        }));
      }
    } catch {
      // Skip unsupported known scripts for the current network
    }
  }

  console.warn("Could not resolve cell deps for lock script:", lockScript);
  return undefined;
}

function OpenChannelForm({
  fiber,
  signer,
  onSuccess,
}: {
  fiber: any;
  signer: any;
  onSuccess: () => void;
}) {
  const { locale, t } = useI18n();
  const fundingAmountInputId = "channel-funding-amount";
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<FormMessageTone>("info");

  const showInfoMessage = (value: string) => {
    setMessageTone("info");
    setMessage(value);
  };

  const showErrorMessage = (value: string) => {
    setMessageTone("error");
    setMessage(value);
  };

  const formatParts = (parts: Array<string | number>, separator = " ") =>
    parts.filter((part) => String(part).length > 0).join(separator);

  const formatLabeledValue = (labelKey: string, value: string | number) =>
    formatParts([t(labelKey), value]);

  const formatPrefixedError = (messageKey: string, values?: Record<string, string | number>) =>
    formatParts([t("channelsPage.errorPrefix"), t(messageKey, values)]);

  const formatMultilineMessage = (lines: string[]) => lines.join("\n");

  const clearMessage = () => {
    setMessageTone("info");
    setMessage("");
  };

  const handleOpen = async () => {
    if (!signer) {
      showErrorMessage(formatPrefixedError("channelsPage.walletRequiredError"));
      return;
    }
    if (!amount) {
      showErrorMessage(formatPrefixedError("channelsPage.missingAmountError"));
      return;
    }
    if (Number(amount) < 600) {
      showErrorMessage(formatPrefixedError("channelsPage.minimumAmountError"));
      return;
    }
    setSubmitting(true);
    clearMessage();
    try {
      const addrs = await signer.getAddresses();
      const addr = await ccc.Address.fromString(addrs[0], signer.client);
      const lockScript = addr.script;

      const fundingLockScript = {
        code_hash: lockScript.codeHash as `0x${string}`,
        hash_type: lockScript.hashType as "type" | "data" | "data1" | "data2",
        args: lockScript.args as string,
      };

      const fundingLockScriptCellDeps = await resolveFundingLockCellDeps(
        signer.client,
        fundingLockScript,
      );

      showInfoMessage(t("channelsPage.connectingDefaultPeer"));
      try {
        await fiber.connectPeer({ address: DEFAULT_PEER_ADDRESS });
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (!msg.includes("already connected") && !msg.includes("Already")) {
          throw new Error(
            formatLabeledValue("channelsPage.failedToConnectDefaultPeer", msg),
          );
        }
      }
      await new Promise((r) => setTimeout(r, 1000));

      // Verify peer is actually connected
      showInfoMessage(t("channelsPage.verifyingPeerConnection"));
      const peers = await fiber.listPeers();
      const isConnected = (peers.peers || []).some(
        (p: any) => p.pubkey === DEFAULT_PEER_PUBKEY,
      );
      if (!isConnected) {
        throw new Error(t("channelsPage.peerConnectionFailed"));
      }

      // Check for stuck pending channels with this peer
      try {
        const existingChannels = await fiber.listChannels({});
        const pendingWithPeer = existingChannels.channels.filter(
          (ch: any) => ch.pubkey === DEFAULT_PEER_PUBKEY &&
            !ch.state.state_name.includes("Closed") &&
            !ch.state.state_name.includes("Normal") &&
            !ch.state.state_name.includes("Ready")
        );
        if (pendingWithPeer.length > 0) {
          console.warn("Found pending channels with this peer:", pendingWithPeer);
          showInfoMessage(
            t("channelsPage.cleaningPendingChannels", {
              count: pendingWithPeer.length,
            }),
          );
          for (const ch of pendingWithPeer) {
            try {
              await fiber.shutdownChannel({ channel_id: ch.channel_id, force: true });
            } catch {}
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (e) {
        console.warn("Failed to check existing channels:", e);
      }

      showInfoMessage(t("channelsPage.negotiatingChannel"));

      const openPromise = fiber.openChannelWithExternalFunding({
        pubkey: DEFAULT_PEER_PUBKEY,
        funding_amount: ckbToShannons(amount),
        public: true,
        shutdown_script: fundingLockScript,
        funding_lock_script: fundingLockScript,
        funding_lock_script_cell_deps: fundingLockScriptCellDeps,
      });

      // Timeout after 60s — peer must auto-accept for this to succeed
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(
          t("channelsPage.peerDidNotAcceptInTime")
        )), 60000)
      );

      const result = await Promise.race([openPromise, timeoutPromise]);

      showInfoMessage(t("channelsPage.preparingFundingTransaction"));

      const unsignedTx = result.unsigned_funding_tx;
      // Save original witnesses — server's placeholders must go back after signing
      const originalWitnesses = [...unsignedTx.witnesses] as `0x${string}`[];

      const tx = ccc.Transaction.from({
        version: Number(unsignedTx.version),
        cellDeps: unsignedTx.cell_deps.map((cd: any) => ({
          outPoint: { txHash: cd.out_point.tx_hash, index: Number(cd.out_point.index) },
          depType: toCccDepType(cd.dep_type),
        })),
        headerDeps: unsignedTx.header_deps,
        inputs: unsignedTx.inputs.map((inp: any) => ({
          previousOutput: { txHash: inp.previous_output.tx_hash, index: Number(inp.previous_output.index) },
          since: Number(inp.since),
        })),
        outputs: unsignedTx.outputs.map((out: any) => ({
          capacity: out.capacity,
          lock: { codeHash: out.lock.code_hash, hashType: out.lock.hash_type, args: out.lock.args },
          type: out.type ? { codeHash: out.type.code_hash, hashType: out.type.hash_type, args: out.type.args } : undefined,
        })),
        outputsData: unsignedTx.outputs_data,
        witnesses: unsignedTx.witnesses,
      });

      // Pre-fetch all input cells so CCC can identify script groups
      showInfoMessage(t("channelsPage.resolvingInputCells"));
      for (const input of tx.inputs) {
        try { await input.getCell(signer.client); } catch {}
      }

      // Determine which inputs belong to the connected wallet
      const userLock = lockScript; // already a ccc.Script
      let userFirstIndex = -1;
      for (let i = 0; i < tx.inputs.length; i++) {
        try {
          const cell = await tx.inputs[i].getCell(signer.client);
          if (cell.cellOutput.lock.eq(userLock)) {
            if (userFirstIndex === -1) userFirstIndex = i;
          }
        } catch {}
      }
      if (userFirstIndex === -1) {
        throw new Error(t("channelsPage.noWalletInputs"));
      }

      // Use prepareTransaction to let CCC set up the correct witness format
      // for the wallet's lock type (secp256k1=65B, OmniLock=larger, JoyID=variable).
      // prepareTransaction may also add cell deps — we restore the originals after.
      const savedCellDeps = unsignedTx.cell_deps.map((cd: any) =>
        ccc.CellDep.from({
          outPoint: { txHash: cd.out_point.tx_hash, index: Number(cd.out_point.index) },
          depType: toCccDepType(cd.dep_type),
        })
      );

      const preparedTx = await signer.prepareTransaction(tx);

      // Restore Fiber's original cell deps — critical for correct tx_hash
      preparedTx.cellDeps = savedCellDeps;

      // Clear non-user witnesses (peer's inputs)
      for (let i = 0; i < preparedTx.inputs.length; i++) {
        if (i !== userFirstIndex && i < preparedTx.witnesses.length) {
          preparedTx.witnesses[i] = "0x";
        }
      }

      showInfoMessage(t("channelsPage.approveSignature"));

      saveJoyIdFundingSession(window.localStorage, {
        channelId: result.channel_id,
        unsignedFundingTx: {
          version: unsignedTx.version,
          cell_deps: unsignedTx.cell_deps,
          header_deps: unsignedTx.header_deps,
          inputs: unsignedTx.inputs,
          outputs: unsignedTx.outputs,
          outputs_data: unsignedTx.outputs_data,
          witnesses: originalWitnesses,
        },
        originalWitnesses,
        userFirstIndex,
        locale,
        createdAt: Date.now(),
      });

      // signOnlyTransaction signs using the wallet's native method
      // (secp256k1 ECDSA, EVM personal_sign, JoyID WebAuthn, etc.)
      const signedTx = await signer.signOnlyTransaction(preparedTx);

      // Extract the signed witness for the user's input
      const signedUserWitness = typeof signedTx.witnesses[userFirstIndex] === "string"
        ? signedTx.witnesses[userFirstIndex] as string
        : ccc.hexFrom(signedTx.witnesses[userFirstIndex]);

      // Compose final witnesses: signed for user's input, original placeholders for server's
      const finalWitnesses = originalWitnesses.map((w: string, i: number) => {
        if (i === userFirstIndex) return signedUserWitness;
        return w;
      });

      showInfoMessage(t("channelsPage.submittingToNetwork"));

      const signedFiberTx = {
        version: unsignedTx.version,
        cell_deps: unsignedTx.cell_deps,
        header_deps: unsignedTx.header_deps,
        inputs: unsignedTx.inputs,
        outputs: unsignedTx.outputs,
        outputs_data: unsignedTx.outputs_data,
        witnesses: finalWitnesses,
      };

      const submitResult = await fiber.submitSignedFundingTx({
        channel_id: result.channel_id,
        signed_funding_tx: signedFiberTx,
      });

      showInfoMessage(
        formatLabeledValue(
          "channelsPage.channelFunded",
          truncateAddress(submitResult.funding_tx_hash, 10, 8),
        ),
      );
      setAmount("");
      onSuccess();
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.includes("AbortFunding")) {
        showErrorMessage(
          formatMultilineMessage([
            formatPrefixedError("channelsPage.abortFundingIntro"),
            t("channelsPage.abortFundingReasonConflict"),
            t("channelsPage.abortFundingReasonAutoAccept"),
            t("channelsPage.abortFundingReasonVersion"),
            "",
            formatLabeledValue("channelsPage.originalError", errMsg),
          ]),
        );
      } else {
        const normalizedError =
          errMsg === JOYID_REDIRECT_SIGNING_UNSUPPORTED
            ? t("channelsPage.joyIdRedirectSigningUnsupported")
            : errMsg;
        showErrorMessage(
          formatParts([t("channelsPage.errorPrefix"), normalizedError]),
        );
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">{t("channelsPage.openChannel")}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1">
            {t("channelsPage.defaultPeerLabel")}
          </label>
          <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-3">
            <div className="text-sm text-white font-medium">
              fiber.nervosscan.com
            </div>
            <div className="text-xs text-white/40 mt-1 font-mono break-all">
              {DEFAULT_PEER_ADDRESS}
            </div>
          </div>
          <p className="text-xs text-white/30 mt-1">
            {t("channelsPage.defaultPeerHelp")}
          </p>
        </div>

        <div>
          <label htmlFor={fundingAmountInputId} className="block text-sm text-white/60 mb-1">
            {t("channelsPage.fundingAmount")}
          </label>
          <input
            id={fundingAmountInputId}
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("channelsPage.fundingAmountPlaceholder")}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-white/30 mt-1">
            {t("channelsPage.fundingAmountHelp")}
          </p>
        </div>

        {message && (
          <div className={`text-sm p-3 rounded-lg ${messageTone === "error" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
            {message}
          </div>
        )}

        {!signer && (
          <div className="text-sm p-3 rounded-lg bg-yellow-500/10 text-yellow-400">
            {t("channelsPage.fundWalletHint")}
          </div>
        )}

        <button
          onClick={handleOpen}
          disabled={submitting || !signer}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? t("channelsPage.processing")
            : t("channelsPage.openAndFund")}
        </button>
      </div>
    </div>
  );
}

function ChannelCard({ channel, fiber, onClose }: { channel: Channel; fiber: any; onClose: () => void }) {
  const { t } = useI18n();
  const [closing, setClosing] = useState(false);
  const formatLabeledValue = (labelKey: string, value: string | number) =>
    [t(labelKey), value].filter((part) => String(part).length > 0).join(" ");

  const stateColor =
    channel.state.state_name.includes("Ready") || channel.state.state_name.includes("Normal")
      ? "text-green-400"
      : channel.state.state_name.includes("Closed") || channel.state.state_name.includes("Shutdown")
        ? "text-red-400"
        : "text-yellow-400";

  const handleShutdown = async (force: boolean) => {
    setClosing(true);
    try {
      await fiber.shutdownChannel({ channel_id: channel.channel_id, force });
      onClose();
    } catch (e: any) {
      alert(formatLabeledValue("channelsPage.closeChannelError", e?.message || String(e)));
    }
    setClosing(false);
  };

  return (
    <div className="rounded-lg bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${stateColor}`}>{channel.state.state_name}</span>
            {channel.is_public && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">{t("channelsPage.public")}</span>}
          </div>
          <div className="text-xs text-white/40 font-mono break-all">
            {formatLabeledValue("channelsPage.id", truncateAddress(channel.channel_id, 10, 8))}
          </div>
          <div className="text-xs text-white/40 font-mono">
            {formatLabeledValue("channelsPage.peer", truncateAddress(channel.pubkey, 10, 8))}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="text-sm font-medium">{shannonsToDisplay(channel.local_balance)} CKB</div>
          <div className="text-xs text-white/40">{t("channelsPage.localBalance")}</div>
          <div className="text-xs text-white/50 mt-1">
            {formatLabeledValue(
              "channelsPage.remoteBalance",
              `${shannonsToDisplay(channel.remote_balance)} CKB`,
            )}
          </div>
        </div>
      </div>
      {!channel.state.state_name.includes("Closed") && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
          <button
            onClick={() => handleShutdown(false)}
            disabled={closing}
            className="px-3 py-1 rounded text-xs bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 transition-colors disabled:opacity-50"
          >
            {t("channelsPage.closeChannel")}
          </button>
          <button
            onClick={() => handleShutdown(true)}
            disabled={closing}
            className="px-3 py-1 rounded text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
          >
            {t("channelsPage.forceClose")}
          </button>
        </div>
      )}
    </div>
  );
}
