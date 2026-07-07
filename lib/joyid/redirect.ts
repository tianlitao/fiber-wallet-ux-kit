import type {
  AuthResponseData,
  SignCkbRawTxResponseData,
} from "@joyid/common";
import { ccc } from "@ckb-ccc/core";

export const JOYID_REDIRECT_CONNECTION_KEY =
  "fiber_joyid_redirect_connection";
export const JOYID_REDIRECT_PENDING_KEY = "fiber_joyid_redirect_pending_auth";
export const JOYID_REDIRECT_PENDING_SIGN_KEY =
  "fiber_joyid_redirect_pending_sign";
export const JOYID_REDIRECT_SIGN_RESULT_KEY =
  "fiber_joyid_redirect_sign_result";
export const CCC_CONNECTION_INFO_KEY = "ccc-connection-info";
export const JOYID_WALLET_NAME = "JoyID Passkey";
export const JOYID_SIGNER_NAME = "CKB";

export type JoyIdRedirectConnection = {
  address: string;
  publicKey: ccc.Hex;
  keyType: string;
};

export type JoyIdRedirectSignedTx = SignCkbRawTxResponseData["tx"];
export type JoyIdRedirectSignedTxResult = {
  requestKey: string;
  tx: JoyIdRedirectSignedTx;
};

function isJoyIdRedirectConnection(
  value: unknown,
): value is JoyIdRedirectConnection {
  if (typeof value !== "object" || value === null) return false;

  const connection = value as Record<string, unknown>;

  return (
    typeof connection.address === "string" &&
    typeof connection.publicKey === "string" &&
    connection.publicKey.startsWith("0x") &&
    typeof connection.keyType === "string"
  );
}

export function saveJoyIdRedirectConnection(
  storage: Storage,
  connection: JoyIdRedirectConnection | undefined,
) {
  if (!connection) {
    storage.removeItem(JOYID_REDIRECT_CONNECTION_KEY);
    return;
  }

  storage.setItem(JOYID_REDIRECT_CONNECTION_KEY, JSON.stringify(connection));
}

export function loadJoyIdRedirectConnection(storage: Storage) {
  const raw = storage.getItem(JOYID_REDIRECT_CONNECTION_KEY);

  if (raw === null) return undefined;
  if (raw === "") {
    storage.removeItem(JOYID_REDIRECT_CONNECTION_KEY);
    return undefined;
  }

  try {
    const connection = JSON.parse(raw) as unknown;
    if (!isJoyIdRedirectConnection(connection)) {
      storage.removeItem(JOYID_REDIRECT_CONNECTION_KEY);
      return undefined;
    }
    return connection;
  } catch {
    storage.removeItem(JOYID_REDIRECT_CONNECTION_KEY);
    return undefined;
  }
}

export function setJoyIdConnectPending(storage: Storage) {
  storage.setItem(JOYID_REDIRECT_PENDING_KEY, "1");
}

export function clearJoyIdConnectPending(storage: Storage) {
  storage.removeItem(JOYID_REDIRECT_PENDING_KEY);
}

export function hasJoyIdConnectPending(storage: Storage) {
  return storage.getItem(JOYID_REDIRECT_PENDING_KEY) === "1";
}

export function setJoyIdSignPending(storage: Storage, requestKey: string) {
  storage.setItem(JOYID_REDIRECT_PENDING_SIGN_KEY, requestKey);
}

export function clearJoyIdSignPending(storage: Storage) {
  storage.removeItem(JOYID_REDIRECT_PENDING_SIGN_KEY);
}

export function hasJoyIdSignPending(storage: Storage) {
  const raw = storage.getItem(JOYID_REDIRECT_PENDING_SIGN_KEY);
  return raw !== null && raw !== "";
}

export function saveJoyIdRedirectSignResult(
  storage: Storage,
  result: JoyIdRedirectSignedTxResult | undefined,
) {
  if (!result) {
    clearJoyIdRedirectSignResult(storage);
    return;
  }

  storage.setItem(JOYID_REDIRECT_SIGN_RESULT_KEY, JSON.stringify(result));
}

export function clearJoyIdRedirectSignResult(storage: Storage) {
  storage.removeItem(JOYID_REDIRECT_SIGN_RESULT_KEY);
}

export function loadJoyIdRedirectSignResult(storage: Storage) {
  const raw = storage.getItem(JOYID_REDIRECT_SIGN_RESULT_KEY);

  if (raw === null) return undefined;
  if (raw === "") {
    clearJoyIdRedirectSignResult(storage);
    return undefined;
  }

  try {
    const result = JSON.parse(raw) as JoyIdRedirectSignedTxResult;

    if (
      typeof result !== "object" ||
      result === null ||
      typeof result.requestKey !== "string" ||
      typeof result.tx !== "object" ||
      result.tx === null ||
      !("witnesses" in result.tx) ||
      !Array.isArray(result.tx.witnesses)
    ) {
      clearJoyIdRedirectSignResult(storage);
      return undefined;
    }

    return result;
  } catch {
    clearJoyIdRedirectSignResult(storage);
    return undefined;
  }
}

export function saveJoyIdConnectorSelection(storage: Storage) {
  storage.setItem(
    CCC_CONNECTION_INFO_KEY,
    JSON.stringify({
      walletName: JOYID_WALLET_NAME,
      signerName: JOYID_SIGNER_NAME,
    }),
  );
}

export function stripJoyIdRedirectParams(href: string) {
  const url = new URL(href);
  url.searchParams.delete("_data_");
  url.searchParams.delete("joyid-redirect");
  return url.toString();
}

export function consumeJoyIdAuthRedirect(args: {
  href: string;
  pendingStorage: Storage;
  connectionStorage: Storage;
  isRedirectFromJoyID: (uri?: string) => boolean;
  parseAuth: (uri?: string) => AuthResponseData;
}) {
  const {
    href,
    pendingStorage,
    connectionStorage,
    isRedirectFromJoyID,
    parseAuth,
  } = args;

  if (
    !hasJoyIdConnectPending(pendingStorage) ||
    !isRedirectFromJoyID(href)
  ) {
    return undefined;
  }

  try {
    const response = parseAuth(href);
    const connection: JoyIdRedirectConnection = {
      address: response.address,
      publicKey: ccc.hexFrom(response.pubkey),
      keyType: response.keyType,
    };

    saveJoyIdRedirectConnection(connectionStorage, connection);
    clearJoyIdConnectPending(pendingStorage);

    return {
      connection,
      cleanedHref: stripJoyIdRedirectParams(href),
    };
  } catch (error) {
    clearJoyIdConnectPending(pendingStorage);
    throw error;
  }
}

export function consumeJoyIdSignRedirect(args: {
  href: string;
  pendingStorage: Storage;
  signingStorage: Storage;
  isRedirectFromJoyID: (uri?: string) => boolean;
  parseSign: (uri?: string) => SignCkbRawTxResponseData;
}) {
  const {
    href,
    pendingStorage,
    signingStorage,
    isRedirectFromJoyID,
    parseSign,
  } = args;

  if (!hasJoyIdSignPending(pendingStorage) || !isRedirectFromJoyID(href)) {
    return undefined;
  }

  const requestKey = pendingStorage.getItem(JOYID_REDIRECT_PENDING_SIGN_KEY);
  if (!requestKey) {
    clearJoyIdSignPending(pendingStorage);
    return undefined;
  }

  try {
    const response = parseSign(href);
    saveJoyIdRedirectSignResult(signingStorage, {
      requestKey,
      tx: response.tx,
    });
    clearJoyIdSignPending(pendingStorage);

    return {
      signedTx: response.tx,
      cleanedHref: stripJoyIdRedirectParams(href),
    };
  } catch (error) {
    clearJoyIdSignPending(pendingStorage);
    throw error;
  }
}
