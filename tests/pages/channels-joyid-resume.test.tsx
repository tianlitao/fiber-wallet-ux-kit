import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECP256K1_CODE_HASH =
  "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";

const { fiberState, pathnameState, signerState, transactionState } = vi.hoisted(() => ({
  fiberState: {
    fiber: {
      listChannels: vi.fn(),
      listPeers: vi.fn(),
      connectPeer: vi.fn(),
      openChannelWithExternalFunding: vi.fn(),
      submitSignedFundingTx: vi.fn(),
    },
    status: "running",
    error: null,
    nodeInfo: null,
    defaultPeerConnected: false,
    prfSupported: true as boolean | "insecure" | null,
    startFiber: vi.fn(),
    stopFiber: vi.fn(),
    refreshNodeInfo: vi.fn(),
  },
  pathnameState: {
    current: "/en/channels",
  },
  signerState: {
    isConnected: vi.fn(),
    getRecommendedAddress: vi.fn(),
    getBalance: vi.fn(),
    getAddresses: vi.fn(),
    prepareTransaction: vi.fn(),
    signOnlyTransaction: vi.fn(),
    client: {
      getKnownScript: vi.fn(),
    },
  },
  transactionState: {
    current: null as any,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.current,
}));

vi.mock("@/lib/fiberContext", () => ({
  useFiber: () => fiberState,
}));

vi.mock("@ckb-ccc/connector-react", () => ({
  ccc: {
    useCcc: () => ({
      open: vi.fn(),
      wallet: null,
    }),
    useSigner: () => signerState,
    fixedPointToString: (value: string | number | bigint) => String(value),
    Address: {
      fromString: vi.fn().mockImplementation(async () => ({
        script: {
          codeHash: SECP256K1_CODE_HASH,
          hashType: "type",
          args: "0xabc",
          eq: () => true,
        },
      })),
    },
    Transaction: {
      from: vi.fn().mockImplementation(() => transactionState.current),
    },
    CellDep: {
      from: vi.fn().mockImplementation((value: unknown) => value),
    },
    hexFrom: (value: unknown) => value,
    KnownScript: {
      OmniLock: "OmniLock",
      JoyId: "JoyId",
      PWLock: "PWLock",
      AnyoneCanPay: "AnyoneCanPay",
      NostrLock: "NostrLock",
      Secp256k1Blake160: "Secp256k1Blake160",
      Secp256k1Multisig: "Secp256k1Multisig",
      Secp256k1MultisigV2: "Secp256k1MultisigV2",
    },
  },
}));

async function renderChannelsWithLocaleLayout(locale: "en" | "zh") {
  const [{ default: ChannelsPage }, { default: LocaleLayout }] =
    await Promise.all([
      import("@/app/[locale]/channels/page"),
      import("@/app/[locale]/layout"),
    ]);

  pathnameState.current = `/${locale}/channels`;

  await act(async () => {
    render(
      <LocaleLayout params={{ locale }}>
        <ChannelsPage />
      </LocaleLayout>,
    );
  });
}

describe("ChannelsPage JoyID resume", () => {
  beforeEach(() => {
    cleanup();
    pathnameState.current = "/en/channels";
    fiberState.status = "running";
    fiberState.defaultPeerConnected = true;
    fiberState.fiber.listChannels.mockReset();
    fiberState.fiber.listPeers.mockReset();
    fiberState.fiber.connectPeer.mockReset();
    fiberState.fiber.openChannelWithExternalFunding.mockReset();
    fiberState.fiber.submitSignedFundingTx.mockReset();
    fiberState.fiber.listChannels.mockResolvedValue({ channels: [] });
    fiberState.fiber.listPeers.mockResolvedValue({
      peers: [{
        pubkey: "0376333505e0cfc13bf2ffee4e55027606388b24f00acf418f6535d89cd30749da",
        address: "/dns4/example/tcp/443/wss/p2p/QmPeer",
      }],
    });
    fiberState.fiber.connectPeer.mockResolvedValue(undefined);
    fiberState.fiber.openChannelWithExternalFunding.mockResolvedValue({
      channel_id: "0xchannel",
      unsigned_funding_tx: {
        version: "0x0",
        cell_deps: [],
        header_deps: [],
        inputs: [
          {
            previous_output: { tx_hash: "0xinput", index: "0x0" },
            since: "0x0",
          },
        ],
        outputs: [],
        outputs_data: [],
        witnesses: ["0xpeer"],
      },
    });
    fiberState.fiber.submitSignedFundingTx.mockResolvedValue({
      funding_tx_hash: "0x1234567890abcdef",
    });
    signerState.isConnected.mockReset();
    signerState.getRecommendedAddress.mockReset();
    signerState.getBalance.mockReset();
    signerState.getAddresses.mockReset();
    signerState.prepareTransaction.mockReset();
    signerState.signOnlyTransaction.mockReset();
    signerState.isConnected.mockResolvedValue(true);
    signerState.getRecommendedAddress.mockResolvedValue("ckt1qresume");
    signerState.getBalance.mockResolvedValue("0");
    signerState.getAddresses.mockResolvedValue(["ckt1qresume"]);
    transactionState.current = {
      cellDeps: [],
      inputs: [
        {
          getCell: vi.fn().mockResolvedValue({
            cellOutput: {
              lock: {
                eq: () => true,
              },
            },
          }),
        },
      ],
      witnesses: ["0xpeer"],
    };
    signerState.prepareTransaction.mockResolvedValue(transactionState.current);
    signerState.signOnlyTransaction.mockResolvedValue({
      witnesses: ["0xsigned"],
    });
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("resumes a pending joyid funding session and submits it automatically", async () => {
    window.localStorage.setItem(
      "fiber_joyid_funding_session",
      JSON.stringify({
        channelId: "0xchannel",
        unsignedFundingTx: {
          version: "0x0",
          cell_deps: [],
          header_deps: [],
          inputs: [],
          outputs: [],
          outputs_data: [],
          witnesses: ["0xpeer"],
        },
        originalWitnesses: ["0xpeer"],
        userFirstIndex: 0,
        locale: "en",
        createdAt: Date.now(),
      }),
    );
    window.sessionStorage.setItem(
      "fiber_joyid_redirect_sign_result",
      JSON.stringify({
        requestKey: "req",
        tx: {
          witnesses: ["0xsigned"],
        },
      }),
    );

    await renderChannelsWithLocaleLayout("en");

    await waitFor(() => {
      expect(fiberState.fiber.submitSignedFundingTx).toHaveBeenCalledWith({
        channel_id: "0xchannel",
        signed_funding_tx: expect.objectContaining({
          witnesses: ["0xsigned"],
        }),
      });
    });

    expect(window.localStorage.getItem("fiber_joyid_funding_session")).toBeNull();
    expect(
      window.sessionStorage.getItem("fiber_joyid_redirect_sign_result"),
    ).toBeNull();
    expect(
      screen.getByText("Channel funded after JoyID redirect."),
    ).toBeInTheDocument();
  });

  it("clears JoyID resume state and shows an error when resumed submit fails", async () => {
    fiberState.fiber.submitSignedFundingTx.mockRejectedValue(
      new Error("submit failed"),
    );

    window.localStorage.setItem(
      "fiber_joyid_funding_session",
      JSON.stringify({
        channelId: "0xchannel",
        unsignedFundingTx: {
          version: "0x0",
          cell_deps: [],
          header_deps: [],
          inputs: [],
          outputs: [],
          outputs_data: [],
          witnesses: ["0xpeer"],
        },
        originalWitnesses: ["0xpeer"],
        userFirstIndex: 0,
        locale: "en",
        createdAt: Date.now(),
      }),
    );
    window.sessionStorage.setItem(
      "fiber_joyid_redirect_sign_result",
      JSON.stringify({
        requestKey: "req",
        tx: {
          witnesses: ["0xsigned"],
        },
      }),
    );

    await renderChannelsWithLocaleLayout("en");

    await waitFor(() => {
      expect(
        screen.getByText(
          "Failed to finish channel funding after returning from JoyID. Please try again.",
        ),
      ).toBeInTheDocument();
    });

    expect(window.localStorage.getItem("fiber_joyid_funding_session")).toBeNull();
    expect(
      window.sessionStorage.getItem("fiber_joyid_redirect_sign_result"),
    ).toBeNull();
  });

  it("persists a funding session before JoyID redirect signing begins", async () => {
    signerState.signOnlyTransaction.mockRejectedValueOnce(
      new Error("redirect-started"),
    );

    await renderChannelsWithLocaleLayout("en");
    const pageMain = screen.getByRole("main");

    fireEvent.click(within(pageMain).getByRole("button", { name: "Open Channel" }));
    fireEvent.change(
      screen.getByLabelText("Funding Amount (CKB)"),
      { target: { value: "600" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Open & Fund Channel" }));

    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem("fiber_joyid_funding_session")!),
      ).toMatchObject({
        channelId: "0xchannel",
        userFirstIndex: 0,
        originalWitnesses: ["0xpeer"],
        locale: "en",
      });
    }, { timeout: 4000 });
  });
});
