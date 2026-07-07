const JOYID_FUNDING_SESSION_KEY = "fiber_joyid_funding_session";

export const FUNDING_SESSION_TTL_MS = 5 * 60 * 1000;

type FundingScript = {
  code_hash: `0x${string}`;
  hash_type: "type" | "data" | "data1" | "data2";
  args: string;
};

type FundingJsonRpcTransaction = {
  version: `0x${string}`;
  cell_deps: Array<{
    dep_type: string;
    out_point: {
      tx_hash: `0x${string}`;
      index: `0x${string}`;
    };
  }>;
  header_deps: `0x${string}`[];
  inputs: Array<{
    previous_output: {
      tx_hash: `0x${string}`;
      index: `0x${string}`;
    };
    since: `0x${string}`;
  }>;
  outputs: Array<{
    capacity: `0x${string}`;
    lock: FundingScript;
    type?: FundingScript;
  }>;
  outputs_data: `0x${string}`[];
  witnesses: `0x${string}`[];
};

export type JoyIdFundingSession = {
  channelId: `0x${string}`;
  unsignedFundingTx: FundingJsonRpcTransaction;
  originalWitnesses: `0x${string}`[];
  userFirstIndex: number;
  locale: string;
  createdAt: number;
};

function isUnsignedFundingTx(value: unknown): value is FundingJsonRpcTransaction {
  if (typeof value !== "object" || value === null) return false;

  const tx = value as Partial<FundingJsonRpcTransaction>;

  return (
    typeof tx.version === "string" &&
    Array.isArray(tx.cell_deps) &&
    Array.isArray(tx.header_deps) &&
    Array.isArray(tx.inputs) &&
    Array.isArray(tx.outputs) &&
    Array.isArray(tx.outputs_data) &&
    Array.isArray(tx.witnesses) &&
    tx.witnesses.every((item) => typeof item === "string")
  );
}

function isJoyIdFundingSession(
  value: unknown,
): value is JoyIdFundingSession {
  if (typeof value !== "object" || value === null) return false;

  const session = value as Record<string, unknown>;

  return (
    typeof session.channelId === "string" &&
    session.channelId.startsWith("0x") &&
    isUnsignedFundingTx(session.unsignedFundingTx) &&
    Array.isArray(session.originalWitnesses) &&
    session.originalWitnesses.every((item) => typeof item === "string") &&
    typeof session.userFirstIndex === "number" &&
    Number.isInteger(session.userFirstIndex) &&
    session.userFirstIndex >= 0 &&
    session.userFirstIndex < session.originalWitnesses.length &&
    typeof session.locale === "string" &&
    typeof session.createdAt === "number" &&
    Number.isFinite(session.createdAt)
  );
}

export function saveJoyIdFundingSession(
  storage: Storage,
  session: JoyIdFundingSession,
) {
  storage.setItem(JOYID_FUNDING_SESSION_KEY, JSON.stringify(session));
}

export function clearJoyIdFundingSession(storage: Storage) {
  storage.removeItem(JOYID_FUNDING_SESSION_KEY);
}

export function loadJoyIdFundingSession(storage: Storage, now = Date.now()) {
  const raw = storage.getItem(JOYID_FUNDING_SESSION_KEY);

  if (raw === null) return undefined;
  if (raw === "") {
    clearJoyIdFundingSession(storage);
    return undefined;
  }

  try {
    const session = JSON.parse(raw) as unknown;

    if (!isJoyIdFundingSession(session)) {
      clearJoyIdFundingSession(storage);
      return undefined;
    }

    if (session.createdAt > now) {
      clearJoyIdFundingSession(storage);
      return undefined;
    }

    if (now - session.createdAt > FUNDING_SESSION_TTL_MS) {
      clearJoyIdFundingSession(storage);
      return undefined;
    }

    return session;
  } catch {
    clearJoyIdFundingSession(storage);
    return undefined;
  }
}
