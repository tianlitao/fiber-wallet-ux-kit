"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { JoyId } from "@ckb-ccc/joy-id";
import {
  DappRequestType,
  buildJoyIDAuthURL,
  buildJoyIDURL,
  getRedirectResponse,
  isRedirectFromJoyID,
} from "@joyid/common";
import type {
  AuthResponseData,
  CKBTransaction,
  SignCkbRawTxResponseData,
} from "@joyid/common";

export const JOY_ID_WALLET_NAME = "JoyID Passkey";
export const JOY_ID_CKB_SIGNER_NAME = "CKB";
export const JOY_ID_REDIRECT_PENDING_KEY = "fiber-joyid-redirect-pending";
export const JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM = "joyid_request_id";

const CCC_CONNECTION_INFO_KEY = "ccc-connection-info";
const JOY_ID_CONNECTIONS_STORAGE_KEY = "ccc-joy-id-signer";
const JOY_ID_AUTH_REDIRECT_RESPONSE_STORAGE_PREFIX =
  "fiber-joyid-auth-response:";
const JOY_ID_AUTH_REDIRECT_REQUEST_STORAGE_PREFIX =
  "fiber-joyid-auth-request:";
const JOY_ID_SIGN_REDIRECT_RESPONSE_STORAGE_PREFIX =
  "fiber-joyid-sign-response:";
const JOY_ID_SIGN_REDIRECT_REQUEST_STORAGE_PREFIX =
  "fiber-joyid-sign-request:";
const JOY_ID_SIGN_REDIRECT_TIMEOUT_MS = 5 * 60 * 1000;

type AccountSelector = {
  uri: string;
  addressType: string;
};

type JoyIdConnection = {
  readonly address: string;
  readonly publicKey: ccc.Hex;
  readonly keyType: string;
};

type PendingRedirect = {
  addressType: "ckb";
  joyidAppURL: string;
  returnURL: string;
};

type BuildJoyIdRedirectAuthUrlOptions = {
  addressPrefix: string;
  appIcon: string;
  appName: string;
  redirectURL: string;
  joyidAppURL?: string;
};

type BuildJoyIdRedirectAuthRequestOptions =
  BuildJoyIdRedirectAuthUrlOptions & {
    joyidAppURL: string;
  };

type BuildJoyIdRedirectSignCkbRawTxUrlOptions = {
  appIcon: string;
  appName: string;
  joyidAppURL: string;
  redirectURL: string;
  signerAddress: string;
  tx: CKBTransaction;
  witnessIndexes?: number[];
};

type JoyIdSignRedirectStoredResponse =
  | {
      ok: true;
      data: SignCkbRawTxResponseData;
    }
  | {
      ok: false;
      error: string;
    };

type JoyIdAuthRedirectStoredResponse =
  | {
      ok: true;
      data: AuthResponseData;
    }
  | {
      ok: false;
      error: string;
    };

function getDefaultJoyIdAppURL(addressPrefix: string): string {
  return addressPrefix === "ckb"
    ? "https://app.joy.id"
    : "https://testnet.joyid.dev";
}

function isSelectorMatch(
  selector: AccountSelector,
  filter: AccountSelector,
): boolean {
  return (
    selector.uri === filter.uri &&
    selector.addressType.startsWith(filter.addressType)
  );
}

function readPendingRedirect(): PendingRedirect | undefined {
  try {
    const pendingRedirect = JSON.parse(
      window.sessionStorage.getItem(JOY_ID_REDIRECT_PENDING_KEY) ?? "null",
    ) as PendingRedirect | null;

    return pendingRedirect ?? undefined;
  } catch {
    return undefined;
  }
}

function saveCccJoyIdConnectionInfo() {
  window.localStorage.setItem(
    CCC_CONNECTION_INFO_KEY,
    JSON.stringify({
      signerName: JOY_ID_CKB_SIGNER_NAME,
      walletName: JOY_ID_WALLET_NAME,
    }),
  );
}

function clearCccConnectionInfo() {
  window.localStorage.setItem(
    CCC_CONNECTION_INFO_KEY,
    JSON.stringify({
      signerName: undefined,
      walletName: undefined,
    }),
  );
}

function cleanRedirectUrl(returnURL: string) {
  window.history.replaceState(window.history.state, "", returnURL);
}

function createRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function getUnknownErrorMessage(error: unknown): string {
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

function buildJoyIdCallbackUrl(requestId: string): string {
  const callbackUrl = new URL("/joyid-callback", window.location.origin);
  callbackUrl.searchParams.set(JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM, requestId);

  return callbackUrl.href;
}

function removeStoredSignRedirectRequest(requestId: string) {
  window.localStorage.removeItem(
    getJoyIdSignRedirectRequestStorageKey(requestId),
  );
}

function removeStoredAuthRedirectRequest(requestId: string) {
  window.localStorage.removeItem(
    getJoyIdAuthRedirectRequestStorageKey(requestId),
  );
}

function readStoredAuthRedirectResponse(
  requestId: string,
): JoyIdAuthRedirectStoredResponse | undefined {
  const key = getJoyIdAuthRedirectResponseStorageKey(requestId);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return undefined;
  }

  window.localStorage.removeItem(key);
  return JSON.parse(raw) as JoyIdAuthRedirectStoredResponse;
}

function storeJoyIdAuthRedirectResponse(
  requestId: string,
  response: JoyIdAuthRedirectStoredResponse,
) {
  window.localStorage.setItem(
    getJoyIdAuthRedirectResponseStorageKey(requestId),
    JSON.stringify(response),
  );
}

function readStoredSignRedirectResponse(
  requestId: string,
): JoyIdSignRedirectStoredResponse | undefined {
  const key = getJoyIdSignRedirectResponseStorageKey(requestId);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return undefined;
  }

  window.localStorage.removeItem(key);
  return JSON.parse(raw) as JoyIdSignRedirectStoredResponse;
}

function storeJoyIdSignRedirectResponse(
  requestId: string,
  response: JoyIdSignRedirectStoredResponse,
) {
  window.localStorage.setItem(
    getJoyIdSignRedirectResponseStorageKey(requestId),
    JSON.stringify(response),
  );
}

function waitForSignRedirectResponse(
  requestId: string,
  popup: Window | null,
): Promise<SignCkbRawTxResponseData> {
  const key = getJoyIdSignRedirectResponseStorageKey(requestId);

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("storage", handleStorage);
    };

    const consume = () => {
      const stored = readStoredSignRedirectResponse(requestId);
      if (!stored) {
        return false;
      }

      cleanup();
      try {
        popup?.close();
      } catch {}

      if (stored.ok) {
        resolve(stored.data);
      } else {
        reject(new Error(stored.error));
      }

      return true;
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) {
        consume();
      }
    };

    const intervalId = window.setInterval(consume, 500);
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("JoyID signing timed out"));
    }, JOY_ID_SIGN_REDIRECT_TIMEOUT_MS);

    window.addEventListener("storage", handleStorage);
    consume();
  });
}

function waitForAuthRedirectResponse(
  requestId: string,
  popup: Window | null,
): Promise<AuthResponseData> {
  const key = getJoyIdAuthRedirectResponseStorageKey(requestId);

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("storage", handleStorage);
    };

    const consume = () => {
      const stored = readStoredAuthRedirectResponse(requestId);
      if (!stored) {
        return false;
      }

      cleanup();
      try {
        popup?.close();
      } catch {}

      if (stored.ok) {
        resolve(stored.data);
      } else {
        reject(new Error(stored.error));
      }

      return true;
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) {
        consume();
      }
    };

    const intervalId = window.setInterval(consume, 500);
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("JoyID connection timed out"));
    }, JOY_ID_SIGN_REDIRECT_TIMEOUT_MS);

    window.addEventListener("storage", handleStorage);
    consume();
  });
}

export function buildJoyIdRedirectAuthUrl({
  addressPrefix,
  appIcon,
  appName,
  redirectURL,
  joyidAppURL,
}: BuildJoyIdRedirectAuthUrlOptions): string {
  return buildJoyIDAuthURL(
    {
      redirectURL,
      joyidAppURL: joyidAppURL ?? getDefaultJoyIdAppURL(addressPrefix),
      name: appName,
      logo: appIcon,
    },
    "redirect",
  );
}

export function buildJoyIdPopupAuthUrl({
  addressPrefix,
  appIcon,
  appName,
  redirectURL,
  joyidAppURL,
}: BuildJoyIdRedirectAuthUrlOptions): string {
  return buildJoyIDAuthURL(
    {
      redirectURL,
      joyidAppURL: joyidAppURL ?? getDefaultJoyIdAppURL(addressPrefix),
      name: appName,
      logo: appIcon,
    },
    "popup",
  );
}

export function getJoyIdAuthRedirectResponseStorageKey(
  requestId: string,
): string {
  return `${JOY_ID_AUTH_REDIRECT_RESPONSE_STORAGE_PREFIX}${requestId}`;
}

export function getJoyIdAuthRedirectRequestStorageKey(
  requestId: string,
): string {
  return `${JOY_ID_AUTH_REDIRECT_REQUEST_STORAGE_PREFIX}${requestId}`;
}

export function getJoyIdSignRedirectResponseStorageKey(
  requestId: string,
): string {
  return `${JOY_ID_SIGN_REDIRECT_RESPONSE_STORAGE_PREFIX}${requestId}`;
}

export function getJoyIdSignRedirectRequestStorageKey(
  requestId: string,
): string {
  return `${JOY_ID_SIGN_REDIRECT_REQUEST_STORAGE_PREFIX}${requestId}`;
}

export function buildJoyIdSignRedirectBridgeUrl(requestId: string): string {
  const bridgeUrl = new URL("/joyid-sign-bridge", window.location.origin);
  bridgeUrl.searchParams.set(JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM, requestId);

  return bridgeUrl.href;
}

export function storeJoyIdAuthRedirectRequest(
  requestId: string,
  request: BuildJoyIdRedirectAuthRequestOptions,
) {
  window.localStorage.setItem(
    getJoyIdAuthRedirectRequestStorageKey(requestId),
    JSON.stringify(request),
  );
}

export function readJoyIdAuthRedirectRequest(
  requestId: string,
): BuildJoyIdRedirectAuthRequestOptions | undefined {
  const key = getJoyIdAuthRedirectRequestStorageKey(requestId);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return undefined;
  }

  return JSON.parse(raw) as BuildJoyIdRedirectAuthRequestOptions;
}

export function removeJoyIdAuthRedirectRequest(requestId: string) {
  removeStoredAuthRedirectRequest(requestId);
}

export function storeJoyIdSignRedirectRequest(
  requestId: string,
  request: BuildJoyIdRedirectSignCkbRawTxUrlOptions,
) {
  window.localStorage.setItem(
    getJoyIdSignRedirectRequestStorageKey(requestId),
    JSON.stringify(request),
  );
}

export function readJoyIdSignRedirectRequest(
  requestId: string,
): BuildJoyIdRedirectSignCkbRawTxUrlOptions | undefined {
  const key = getJoyIdSignRedirectRequestStorageKey(requestId);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return undefined;
  }

  return JSON.parse(raw) as BuildJoyIdRedirectSignCkbRawTxUrlOptions;
}

export function removeJoyIdSignRedirectRequest(requestId: string) {
  removeStoredSignRedirectRequest(requestId);
}

export function consumeJoyIdSignRedirectRequest(
  requestId: string,
): BuildJoyIdRedirectSignCkbRawTxUrlOptions | undefined {
  const request = readJoyIdSignRedirectRequest(requestId);
  if (request) {
    removeStoredSignRedirectRequest(requestId);
  }

  return request;
}

export function buildJoyIdRedirectSignCkbRawTxUrl({
  appIcon,
  appName,
  joyidAppURL,
  redirectURL,
  signerAddress,
  tx,
  witnessIndexes,
}: BuildJoyIdRedirectSignCkbRawTxUrlOptions): string {
  return buildJoyIDURL(
    {
      redirectURL,
      joyidAppURL,
      name: appName,
      logo: appIcon,
      tx,
      signerAddress,
      witnessIndexes,
    },
    "redirect",
    "/sign-ckb-raw-tx",
  );
}

export function buildJoyIdPopupSignCkbRawTxUrl({
  appIcon,
  appName,
  joyidAppURL,
  redirectURL,
  signerAddress,
  tx,
  witnessIndexes,
}: BuildJoyIdRedirectSignCkbRawTxUrlOptions): string {
  return buildJoyIDURL(
    {
      redirectURL,
      joyidAppURL,
      name: appName,
      logo: appIcon,
      tx,
      signerAddress,
      witnessIndexes,
    },
    "popup",
    "/sign-ckb-raw-tx",
  );
}

export function storeJoyIdSignRedirectResponseFromMessage(
  requestId: string,
  message: unknown,
): boolean {
  if (
    !message ||
    typeof message !== "object" ||
    !("type" in message) ||
    message.type !== DappRequestType.SignCkbRawTx
  ) {
    return false;
  }

  if (
    "error" in message &&
    typeof message.error === "string" &&
    message.error.length > 0
  ) {
    storeJoyIdSignRedirectResponse(requestId, {
      ok: false,
      error: message.error,
    });
    return true;
  }

  if (!("data" in message) || !message.data) {
    return false;
  }

  storeJoyIdSignRedirectResponse(requestId, {
    ok: true,
    data: message.data as SignCkbRawTxResponseData,
  });
  return true;
}

export function storeJoyIdSignRedirectResponseFromUrl(
  uri = window.location.href,
): boolean {
  const url = new URL(uri);
  const requestId = url.searchParams.get(
    JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM,
  );
  if (!requestId || !isRedirectFromJoyID(uri)) {
    return false;
  }

  try {
    const data = getRedirectResponse<SignCkbRawTxResponseData>(uri);
    storeJoyIdSignRedirectResponse(requestId, {
      ok: true,
      data,
    });
  } catch (error) {
    storeJoyIdSignRedirectResponse(requestId, {
      ok: false,
      error: getUnknownErrorMessage(error),
    });
  }

  return true;
}

export function storeJoyIdAuthRedirectResponseFromMessage(
  requestId: string,
  message: unknown,
): boolean {
  if (
    !message ||
    typeof message !== "object" ||
    !("type" in message) ||
    message.type !== DappRequestType.Auth
  ) {
    return false;
  }

  if (
    "error" in message &&
    typeof message.error === "string" &&
    message.error.length > 0
  ) {
    storeJoyIdAuthRedirectResponse(requestId, {
      ok: false,
      error: message.error,
    });
    return true;
  }

  if (!("data" in message) || !message.data) {
    return false;
  }

  storeJoyIdAuthRedirectResponse(requestId, {
    ok: true,
    data: message.data as AuthResponseData,
  });
  return true;
}

export class RedirectJoyIdConnectionsRepo {
  private operationLock: Promise<void> = Promise.resolve();

  constructor(private readonly storageKey = JOY_ID_CONNECTIONS_STORAGE_KEY) {}

  async readConnections(): Promise<[AccountSelector, JoyIdConnection][]> {
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(this.storageKey) ?? "[]",
      ) as unknown;

      return Array.isArray(parsed)
        ? (parsed as [AccountSelector, JoyIdConnection][])
        : [];
    } catch {
      return [];
    }
  }

  async get(selector: AccountSelector): Promise<JoyIdConnection | undefined> {
    const redirectedConnection = await this.restoreRedirectedConnection(
      selector,
    );
    if (redirectedConnection) {
      return redirectedConnection;
    }

    return (await this.readConnections()).find(([storedSelector]) =>
      isSelectorMatch(selector, storedSelector),
    )?.[1];
  }

  async set(
    selector: AccountSelector,
    connection: JoyIdConnection | undefined,
  ): Promise<void> {
    const operation = this.operationLock
      .catch(() => undefined)
      .then(async () => {
        const connections = await this.readConnections();

        if (connection) {
          const existing = connections.find(([storedSelector]) =>
            isSelectorMatch(storedSelector, selector),
          );
          if (existing) {
            existing[1] = connection;
          } else {
            connections.push([selector, connection]);
          }
        } else {
          const filtered = connections.filter(
            ([storedSelector]) => !isSelectorMatch(storedSelector, selector),
          );
          connections.splice(0, connections.length, ...filtered);
        }

        window.localStorage.setItem(
          this.storageKey,
          JSON.stringify(connections),
        );
      });

    this.operationLock = operation;
    await operation;
  }

  private async restoreRedirectedConnection(
    selector: AccountSelector,
  ): Promise<JoyIdConnection | undefined> {
    const pendingRedirect = readPendingRedirect();
    if (
      !pendingRedirect ||
      !isRedirectFromJoyID() ||
      !isSelectorMatch(selector, {
        uri: pendingRedirect.joyidAppURL,
        addressType: pendingRedirect.addressType,
      })
    ) {
      return undefined;
    }

    try {
      const response = getRedirectResponse<AuthResponseData>();
      const connection = {
        address: response.address,
        publicKey: ccc.hexFrom(response.pubkey),
        keyType: response.keyType,
      };

      await this.set(selector, connection);
      saveCccJoyIdConnectionInfo();

      return connection;
    } catch {
      clearCccConnectionInfo();
      return undefined;
    } finally {
      window.sessionStorage.removeItem(JOY_ID_REDIRECT_PENDING_KEY);
      cleanRedirectUrl(pendingRedirect.returnURL);
    }
  }
}

export class RedirectJoyIdCkbSigner extends JoyId.CkbSigner {
  constructor(
    client: ccc.Client,
    private readonly appName: string,
    private readonly appIcon: string,
    private readonly joyidAppURL = getDefaultJoyIdAppURL(client.addressPrefix),
    aggregatorUri?: string,
  ) {
    super(
      client,
      appName,
      appIcon,
      joyidAppURL,
      aggregatorUri,
      new RedirectJoyIdConnectionsRepo(),
    );
  }

  async connect(): Promise<void> {
    const requestId = createRequestId();
    const bridgeUrl = buildJoyIdSignRedirectBridgeUrl(requestId);

    storeJoyIdAuthRedirectRequest(requestId, {
      addressPrefix: this.client.addressPrefix,
      appIcon: this.appIcon,
      appName: this.appName,
      joyidAppURL: this.joyidAppURL,
      redirectURL: bridgeUrl,
    });

    const popup = window.open(
      bridgeUrl,
      `joyid-connect-${requestId}`,
      "popup,width=480,height=720",
    );

    if (!popup) {
      removeStoredAuthRedirectRequest(requestId);
      throw new Error("JoyID connection window was blocked");
    }

    try {
      const response = await waitForAuthRedirectResponse(requestId, popup);
      await new RedirectJoyIdConnectionsRepo().set(
        {
          addressType: "ckb",
          uri: this.joyidAppURL,
        },
        {
          address: response.address,
          publicKey: ccc.hexFrom(response.pubkey),
          keyType: response.keyType,
        },
      );
      saveCccJoyIdConnectionInfo();
      await this.isConnected();
    } finally {
      removeStoredAuthRedirectRequest(requestId);
    }
  }

  async signOnlyTransaction(
    txLike: ccc.TransactionLike,
  ): Promise<ccc.Transaction> {
    const tx = ccc.Transaction.from(txLike);
    const { script } = await this.getAddressObj();
    const witnessIndexes = await ccc.reduceAsync(
      tx.inputs,
      async (acc, input, i) => {
        const { cellOutput } = await input.getCell(this.client);

        if (cellOutput.lock.eq(script)) {
          acc.push(i);
        }
      },
      [] as number[],
    );

    await tx.prepareSighashAllWitness(script, 0, this.client);
    tx.inputs.forEach((input) => {
      input.cellOutput = undefined;
      input.outputData = undefined;
    });

    const requestId = createRequestId();
    storeJoyIdSignRedirectRequest(requestId, {
      appIcon: this.appIcon,
      appName: this.appName,
      joyidAppURL: this.joyidAppURL,
      redirectURL: buildJoyIdCallbackUrl(requestId),
      signerAddress: await this.getInternalAddress(),
      tx: JSON.parse(tx.stringify()) as CKBTransaction,
      witnessIndexes,
    });

    const popup = window.open(
      buildJoyIdSignRedirectBridgeUrl(requestId),
      `joyid-sign-${requestId}`,
      "popup,width=480,height=720",
    );

    if (!popup) {
      removeStoredSignRedirectRequest(requestId);
      throw new Error("JoyID signing window was blocked");
    }

    const response = await waitForSignRedirectResponse(requestId, popup);
    return ccc.Transaction.from(response.tx);
  }
}

export class JoyIdRedirectSignersController extends ccc.SignersController {
  protected async addSigner(
    walletName: string,
    icon: string,
    signerInfo: ccc.SignerInfo,
    context: ccc.SignersControllerRefreshContext,
  ): Promise<void> {
    if (
      walletName === JOY_ID_WALLET_NAME &&
      signerInfo.name === JOY_ID_CKB_SIGNER_NAME &&
      signerInfo.signer.signType === ccc.SignerSignType.JoyId
    ) {
      return super.addSigner(
        walletName,
        icon,
        {
          ...signerInfo,
          signer: new RedirectJoyIdCkbSigner(
            context.client,
            context.appName,
            context.appIcon,
          ),
        },
        context,
      );
    }

    return super.addSigner(walletName, icon, signerInfo, context);
  }
}
