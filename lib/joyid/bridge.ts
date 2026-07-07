const JOYID_BRIDGE_REQUEST_KEY = "fiber_joyid_bridge_request";
export const JOYID_BRIDGE_PATH = "/joyid-bridge";

export type JoyIdBridgeRequest =
  | {
      type: "connect";
      returnUrl: string;
      payload: {
        config: {
          redirectURL: string;
          joyidAppURL?: string;
          name: string;
          logo: string;
        };
      };
      createdAt: number;
    }
  | {
      type: "sign-ckb-raw-tx";
      returnUrl: string;
      requestKey: string;
      payload: Record<string, unknown>;
      createdAt: number;
    };

function isJoyIdBridgeRequest(value: unknown): value is JoyIdBridgeRequest {
  if (typeof value !== "object" || value === null) return false;

  const request = value as Record<string, unknown>;

  if (
    request.type === "connect" &&
    typeof request.returnUrl === "string" &&
    typeof request.payload === "object" &&
    request.payload !== null &&
    !Array.isArray(request.payload) &&
    "config" in request.payload &&
    typeof (request.payload as { config?: unknown }).config === "object" &&
    (request.payload as { config?: unknown }).config !== null &&
    typeof (
      (request.payload as {
        config?: { redirectURL?: unknown; name?: unknown; logo?: unknown };
      }).config?.redirectURL
    ) === "string" &&
    typeof (
      (request.payload as {
        config?: { redirectURL?: unknown; name?: unknown; logo?: unknown };
      }).config?.name
    ) === "string" &&
    typeof (
      (request.payload as {
        config?: { redirectURL?: unknown; name?: unknown; logo?: unknown };
      }).config?.logo
    ) === "string" &&
    typeof request.createdAt === "number"
  ) {
    return true;
  }

  if (
    request.type === "sign-ckb-raw-tx" &&
    typeof request.returnUrl === "string" &&
    typeof request.requestKey === "string" &&
    typeof request.payload === "object" &&
    request.payload !== null &&
    !Array.isArray(request.payload) &&
    typeof (
      request.payload as {
        signerAddress?: unknown;
        witnessIndexes?: unknown;
        tx?: unknown;
        config?: unknown;
      }
    ).signerAddress === "string" &&
    Array.isArray(
      (
        request.payload as {
          witnessIndexes?: unknown;
        }
      ).witnessIndexes,
    ) &&
    typeof (
      request.payload as {
        tx?: unknown;
      }
    ).tx === "object" &&
    (
      request.payload as {
        tx?: unknown;
      }
    ).tx !== null &&
    typeof (
      request.payload as {
        config?: unknown;
      }
    ).config === "object" &&
    (
      request.payload as {
        config?: unknown;
      }
    ).config !== null &&
    typeof request.createdAt === "number"
  ) {
    return true;
  }

  return false;
}

export function saveJoyIdBridgeRequest(
  storage: Storage,
  request: JoyIdBridgeRequest,
) {
  storage.setItem(JOYID_BRIDGE_REQUEST_KEY, JSON.stringify(request));
}

export function clearJoyIdBridgeRequest(storage: Storage) {
  storage.removeItem(JOYID_BRIDGE_REQUEST_KEY);
}

export function navigateToJoyIdBridge() {
  window.location.assign(JOYID_BRIDGE_PATH);
}

export function returnFromJoyIdBridge(returnUrl: string) {
  window.location.assign(returnUrl);
}

export function loadJoyIdBridgeRequest(storage: Storage) {
  const raw = storage.getItem(JOYID_BRIDGE_REQUEST_KEY);

  if (raw === null) return undefined;
  if (raw === "") {
    clearJoyIdBridgeRequest(storage);
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isJoyIdBridgeRequest(parsed)) {
      clearJoyIdBridgeRequest(storage);
      return undefined;
    }

    return parsed;
  } catch {
    clearJoyIdBridgeRequest(storage);
    return undefined;
  }
}
