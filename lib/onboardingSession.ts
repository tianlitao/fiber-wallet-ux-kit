const ONBOARDING_MNEMONIC_KEY = "fiber_onboarding_mnemonic";
const ONBOARDING_BACKUP_CONFIRMED_KEY = "fiber_onboarding_backup_confirmed";

export function loadOnboardingMnemonic(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ONBOARDING_MNEMONIC_KEY);
}

export function saveOnboardingMnemonic(mnemonic: string) {
  window.sessionStorage.setItem(ONBOARDING_MNEMONIC_KEY, mnemonic);
}

export function clearOnboardingSession() {
  window.sessionStorage.removeItem(ONBOARDING_MNEMONIC_KEY);
  window.sessionStorage.removeItem(ONBOARDING_BACKUP_CONFIRMED_KEY);
}

export function markOnboardingBackupConfirmed() {
  window.sessionStorage.setItem(ONBOARDING_BACKUP_CONFIRMED_KEY, "true");
}

export function hasConfirmedOnboardingBackup() {
  return (
    window.sessionStorage.getItem(ONBOARDING_BACKUP_CONFIRMED_KEY) === "true"
  );
}
