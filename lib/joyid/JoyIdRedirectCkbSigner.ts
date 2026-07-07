import { ccc } from "@ckb-ccc/core";
import { Aggregator } from "@joyid/ckb";
import {
  authCallback,
  isRedirectFromJoyID,
} from "@joyid/common";
import {
  navigateToJoyIdBridge,
  saveJoyIdBridgeRequest,
} from "./bridge";
import {
  clearJoyIdRedirectSignResult,
  clearJoyIdConnectPending,
  consumeJoyIdAuthRedirect,
  loadJoyIdRedirectSignResult,
  loadJoyIdRedirectConnection,
  saveJoyIdRedirectConnection,
  saveJoyIdConnectorSelection,
  type JoyIdRedirectConnection,
} from "./redirect";

export const JOYID_REDIRECT_SIGNING_UNSUPPORTED = "JOYID_REDIRECT_SIGNING_UNSUPPORTED";

export async function prepareJoyIdRedirectSignTx(
  tx: ccc.Transaction,
  client: ccc.Client,
  script: ccc.Script,
) {
  const witnessIndexes: number[] = [];

  for (let i = 0; i < tx.inputs.length; i++) {
    const { cellOutput } = await tx.inputs[i].getCell(client);
    if (cellOutput.lock.eq(script)) {
      witnessIndexes.push(i);
    }
  }

  await tx.prepareSighashAllWitness(script, 0, client);
  tx.inputs.forEach((input) => {
    input.cellOutput = undefined;
    input.outputData = undefined;
  });

  return {
    tx,
    witnessIndexes,
  };
}

export async function buildJoyIdRedirectSignRequestKey(args: {
  tx: Record<string, unknown>;
  witnessIndexes: number[];
  signerAddress: string;
}) {
  const encoded = new TextEncoder().encode(JSON.stringify(args));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export class JoyIdRedirectCkbSigner extends ccc.Signer {
  private connection?: JoyIdRedirectConnection;

  constructor(
    client: ccc.Client,
    private readonly appName: string,
    private readonly appIcon: string,
    private readonly joyidAppURL?: string,
    private readonly aggregatorUri?: string,
  ) {
    super(client);
  }

  get type() {
    return ccc.SignerType.CKB;
  }

  get signType() {
    return ccc.SignerSignType.JoyId;
  }

  private getConfig() {
    return {
      redirectURL: location.href,
      joyidAppURL:
        this.joyidAppURL ??
        (this.client.addressPrefix === "ckb"
          ? "https://app.joy.id"
          : "https://testnet.joyid.dev"),
      name: this.appName,
      logo: this.appIcon,
    };
  }

  private getAggregatorUri() {
    return (
      this.aggregatorUri ??
      (this.client.addressPrefix === "ckb"
        ? "https://cota.nervina.dev/mainnet-aggregator"
        : "https://cota.nervina.dev/aggregator")
    );
  }

  private async assertConnection() {
    if (!(await this.isConnected()) || !this.connection) {
      throw new Error("Not connected");
    }
    return this.connection;
  }

  async connect(): Promise<void> {
    saveJoyIdConnectorSelection(window.localStorage);
    saveJoyIdBridgeRequest(window.sessionStorage, {
      type: "connect",
      returnUrl: window.location.pathname + window.location.search,
      payload: {
        config: this.getConfig(),
      },
      createdAt: Date.now(),
    });
    navigateToJoyIdBridge();
    await new Promise<never>(() => {});
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
    this.connection = undefined;
    saveJoyIdRedirectConnection(window.localStorage, undefined);
    clearJoyIdConnectPending(window.sessionStorage);
    clearJoyIdRedirectSignResult(window.sessionStorage);
  }

  async isConnected(): Promise<boolean> {
    if (this.connection) {
      return true;
    }

    const consumed = consumeJoyIdAuthRedirect({
      href: window.location.href,
      pendingStorage: window.sessionStorage,
      connectionStorage: window.localStorage,
      isRedirectFromJoyID,
      parseAuth: (uri?: string) => authCallback(uri),
    });

    if (consumed) {
      this.connection = consumed.connection;
    }

    if (!this.connection) {
      this.connection = loadJoyIdRedirectConnection(window.localStorage);
    }

    if (consumed?.cleanedHref) {
      window.history.replaceState({}, "", consumed.cleanedHref);
    }

    return this.connection !== undefined;
  }

  async getInternalAddress(): Promise<string> {
    return (await this.assertConnection()).address;
  }

  async getIdentity(): Promise<string> {
    const connection = await this.assertConnection();
    return JSON.stringify({
      keyType: connection.keyType,
      publicKey: connection.publicKey.slice(2),
    });
  }

  async getAddressObj(): Promise<ccc.Address> {
    return ccc.Address.fromString(await this.getInternalAddress(), this.client);
  }

  async getAddressObjs(): Promise<ccc.Address[]> {
    return [await this.getAddressObj()];
  }

  async prepareTransaction(
    txLike: ccc.TransactionLike,
  ): Promise<ccc.Transaction> {
    const tx = ccc.Transaction.from(txLike);
    await tx.addCellDepsOfKnownScripts(this.client, ccc.KnownScript.JoyId);
    const position = await tx.findInputIndexByLock(
      (await this.getAddressObj()).script,
      this.client,
    );

    if (position === undefined) {
      return tx;
    }

    const witness = tx.getWitnessArgsAt(position) ?? ccc.WitnessArgs.from({});
    witness.lock = ccc.hexFrom("00".repeat(1000));
    await this.prepareTransactionForSubKey(tx, witness);
    tx.setWitnessArgsAt(position, witness);

    return tx;
  }

  private async prepareTransactionForSubKey(
    tx: ccc.Transaction,
    witness: ccc.WitnessArgs,
  ) {
    if (
      this.connection?.keyType !== "sub_key" ||
      (witness.outputType ?? "0x") !== "0x"
    ) {
      return;
    }

    const pubkeyHash = ccc.hashCkb(this.connection.publicKey).substring(0, 42);
    const lock = (await this.getAddressObj()).script;
    const aggregator = new Aggregator(this.getAggregatorUri());
    const { unlock_entry: unlockEntry } =
      await aggregator.generateSubkeyUnlockSmt({
        alg_index: 1,
        pubkey_hash: pubkeyHash,
        lock_script: ccc.hexFrom(lock.toBytes()),
      });

    witness.outputType = ccc.hexFrom(unlockEntry);

    const cotaDeps: ccc.CellDep[] = [];
    for await (const cell of this.client.findCellsByLock(
      lock,
      await ccc.Script.fromKnownScript(this.client, ccc.KnownScript.COTA, "0x"),
    )) {
      cotaDeps.push(
        ccc.CellDep.from({
          depType: "code",
          outPoint: cell.outPoint,
        }),
      );
    }

    if (cotaDeps.length === 0) {
      throw new Error("No COTA cells for sub key wallet");
    }

    tx.addCellDepsAtStart(cotaDeps);
  }

  async signOnlyTransaction(
    txLike: ccc.TransactionLike,
  ): Promise<ccc.Transaction> {
    const tx = ccc.Transaction.from(txLike);
    const { script } = await this.getAddressObj();
    const { tx: preparedTx, witnessIndexes } = await prepareJoyIdRedirectSignTx(
      tx,
      this.client,
      script,
    );
    const signerAddress = (await this.assertConnection()).address;
    const serializedTx = JSON.parse(preparedTx.stringify()) as Record<
      string,
      unknown
    >;
    const requestKey = await buildJoyIdRedirectSignRequestKey({
      tx: serializedTx,
      witnessIndexes,
      signerAddress,
    });

    const restoredSignedTx = loadJoyIdRedirectSignResult(window.sessionStorage);
    if (restoredSignedTx) {
      clearJoyIdRedirectSignResult(window.sessionStorage);
      if (restoredSignedTx.requestKey === requestKey) {
        return ccc.Transaction.from(restoredSignedTx.tx);
      }
    }

    saveJoyIdConnectorSelection(window.localStorage);
    saveJoyIdBridgeRequest(window.sessionStorage, {
      type: "sign-ckb-raw-tx",
      returnUrl: window.location.pathname + window.location.search,
      requestKey,
      payload: {
        tx: serializedTx,
        signerAddress,
        witnessIndexes,
        config: this.getConfig(),
      },
      createdAt: Date.now(),
    });
    navigateToJoyIdBridge();
    return await new Promise<ccc.Transaction>(() => {});
  }

  async signMessageRaw(message: string | ccc.BytesLike): Promise<string> {
    void message;
    throw new Error(JOYID_REDIRECT_SIGNING_UNSUPPORTED);
  }
}
