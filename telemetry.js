// القياس السلوكي: مطفي افتراضياً. يرسل أحداث مسموحة فقط، بلا أي قيمة صحية أو معرّف للمستخدم.
import { APP_VERSION, TELEMETRY_ENDPOINT } from "./config.js";

const ALLOWED_EVENTS = new Set([
  "setup_completed",
  "craving_started",
  "craving_won",
  "relapse_reset",
  "backup_exported",
  "backup_imported",
]);

let consent = false;

export function setTelemetryConsent(value) {
  consent = value === true;
}

export function track(event) {
  if (!consent || !TELEMETRY_ENDPOINT || !ALLOWED_EVENTS.has(event)) return false;
  const body = JSON.stringify({ event, appVersion: APP_VERSION });
  try {
    return navigator.sendBeacon?.(TELEMETRY_ENDPOINT, new Blob([body], { type: "text/plain" })) ?? false;
  } catch {
    return false;
  }
}
