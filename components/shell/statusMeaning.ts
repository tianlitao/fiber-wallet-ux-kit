"use client";

type FiberStatus = "idle" | "starting" | "running" | "stopped" | "error";
type StatusTone = "connected" | "connecting" | "offline";

type ShellStatusMeaning = {
  desktopLabelKey: string;
  mobileLabelKey: string;
  tone: StatusTone;
};

const DESKTOP_STATUS_LABELS: Record<FiberStatus, string> = {
  idle: "nav.statusIdle",
  starting: "nav.statusStarting",
  running: "nav.statusRunning",
  stopped: "nav.statusStopped",
  error: "nav.statusError",
};

export function getShellStatusMeaning(
  status: FiberStatus,
  defaultPeerConnected: boolean,
): ShellStatusMeaning {
  if (defaultPeerConnected) {
    return {
      desktopLabelKey: "nav.connected",
      mobileLabelKey: "nav.connected",
      tone: "connected",
    };
  }

  const connecting = status === "running" || status === "starting";

  return {
    desktopLabelKey: DESKTOP_STATUS_LABELS[status],
    mobileLabelKey: connecting ? "nav.connecting" : "nav.offline",
    tone: connecting ? "connecting" : "offline",
  };
}
