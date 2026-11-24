// طبقة التخزين فقط: ما فيهاش DOM ولا حسابات. تقرأ وتكتب البيانات بشكل آمن ومرقّم.
import { LEGACY_KEY, SCHEMA_VERSION, STORAGE_KEY } from "./config.js";
import { isValidQuit, pickQuit, sanitizeCount } from "./validate.js";

function readKey(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // التخزين مقفول (وضع خاص مثلاً)
  }
}

function writeKey(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false; // المساحة ملية أو التخزين ممنوع
  }
}

function parseObject(raw) {
  if (typeof raw !== "string") return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

// كل مرحلة تحوّل من رقم المخطط إلى اللي بعدو
const MIGRATIONS = Object.freeze({
  1: (old) => ({ schema: 2, quit: pickQuit(old), beaten: sanitizeCount(old.beaten) }),
});

function migrate(data) {
  let current = data;
  while (current.schema < SCHEMA_VERSION) {
    const step = MIGRATIONS[current.schema];
    if (!step) return null;
    current = step(current);
  }
  return current;
}

function normalize(raw, now) {
  if (!raw || raw.schema !== SCHEMA_VERSION || !isValidQuit(raw.quit, now)) return null;
  return {
    quit: pickQuit(raw.quit),
    beaten: sanitizeCount(raw.beaten),
    telemetry: raw.telemetry === true,
  };
}

export function saveState(state) {
  return writeKey(
    STORAGE_KEY,
    JSON.stringify({
      schema: SCHEMA_VERSION,
      quit: pickQuit(state.quit),
      beaten: sanitizeCount(state.beaten),
      telemetry: state.telemetry === true,
    }),
  );
}

// يرجع الحالة الصالحة أو null. إذا وجد نسخة MVP قديمة يرحّلها ويحفظها بالمخطط الجديد
export function loadState(now = Date.now()) {
  const current = parseObject(readKey(STORAGE_KEY));
  if (current) return normalize(current, now);

  const legacy = parseObject(readKey(LEGACY_KEY));
  const migrated = legacy ? normalize(migrate({ schema: 1, ...legacy }), now) : null;
  if (migrated) saveState(migrated);
  return migrated;
}

export function buildBackup(state) {
  return JSON.stringify(
    {
      app: "naqla",
      schema: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      quit: pickQuit(state.quit),
      beaten: sanitizeCount(state.beaten),
    },
    null,
    2,
  );
}
