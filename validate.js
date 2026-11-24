// التحقق من المدخلات: كل قيمة تدخل التطبيق تمرّ من هنا (الفورم، التخزين، ملف النسخة الاحتياطية)
import { LIMITS, MAX_BACKUP_BYTES, MINUTE_MS, SCHEMA_VERSION } from "./config.js";

const MIN_DATE = Date.UTC(2000, 0, 1);

const MESSAGES = Object.freeze({
  required: "هذا الحقل لازمو",
  integer: "اكتب عدد صحيح",
  number: "اكتب رقم صحيح",
  date: "اختار تاريخ ووقت صحيحين",
  future: "الوقت ما ينجمش يكون في المستقبل",
  past: "التاريخ قديم برشا",
});

const rangeMessage = ({ min, max }) => `القيمة لازم تكون بين ${min} و${max}`;

// يحوّل الأرقام الهندية والفارسية لأرقام لاتينية، ويقبل الفاصلة العشرية
function normalizeDigits(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/,/g, ".");
}

function checkNumber(raw, rule, integer = false) {
  const text = normalizeDigits(raw);
  if (text === "") return { error: MESSAGES.required };
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return { error: integer ? MESSAGES.integer : MESSAGES.number };
  const n = Number(text);
  if (integer && !Number.isInteger(n)) return { error: MESSAGES.integer };
  if (n < rule.min || n > rule.max) return { error: rangeMessage(rule) };
  return { value: integer ? n : Math.round(n * 100) / 100 };
}

function checkDate(raw, now) {
  const text = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return { error: MESSAGES.date };
  const t = new Date(text).getTime();
  if (!Number.isFinite(t)) return { error: MESSAGES.date };
  if (t > now + MINUTE_MS) return { error: MESSAGES.future };
  if (t < MIN_DATE) return { error: MESSAGES.past };
  return { value: t };
}

// يتحقق من فورم الإعداد ويرجع إما القيم النظيفة أو الأخطاء لكل حقل
export function validateSetup(raw, now = Date.now()) {
  const results = {
    start: checkDate(raw?.start, now),
    cpd: checkNumber(raw?.cpd, LIMITS.cpd, true),
    per: checkNumber(raw?.per, LIMITS.per, true),
    price: checkNumber(raw?.price, LIMITS.price),
  };
  const errors = {};
  for (const [field, result] of Object.entries(results)) {
    if (result.error) errors[field] = result.error;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      start: results.start.value,
      cpd: results.cpd.value,
      per: results.per.value,
      price: results.price.value,
    },
  };
}

function inRange(value, rule, integer) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (!integer || Number.isInteger(value)) &&
    value >= rule.min &&
    value <= rule.max
  );
}

// يتحقق من بيانات مقروءة من التخزين أو من ملف، بعد التحويل إلى أرقام
export function isValidQuit(quit, now = Date.now()) {
  return (
    !!quit &&
    typeof quit === "object" &&
    typeof quit.start === "number" &&
    Number.isFinite(quit.start) &&
    quit.start >= MIN_DATE &&
    quit.start <= now + MINUTE_MS &&
    inRange(quit.cpd, LIMITS.cpd, true) &&
    inRange(quit.per, LIMITS.per, true) &&
    inRange(quit.price, LIMITS.price, false)
  );
}

// يأخذ الحقول المعروفة فقط، ويتجاهل أي شي زايد في الملف
export function pickQuit(quit) {
  return { start: quit.start, cpd: quit.cpd, per: quit.per, price: quit.price };
}

export function sanitizeCount(value) {
  return Number.isInteger(value) && value >= LIMITS.beaten.min && value <= LIMITS.beaten.max ? value : 0;
}

// يتحقق من ملف النسخة الاحتياطية قبل ما يلمس أي بيانات
export function parseBackup(text, now = Date.now()) {
  const fail = (error) => ({ ok: false, error });

  if (typeof text !== "string" || text.trim() === "") return fail("الملف فارغ");
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) return fail("الملف كبير برشا");

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return fail("الملف ماهوش JSON صالح");
  }

  if (!data || typeof data !== "object" || data.app !== "naqla") {
    return fail("هذا الملف ماهوش نسخة من «نقلع»");
  }
  if (!Number.isInteger(data.schema) || data.schema < 2 || data.schema > SCHEMA_VERSION) {
    return fail("نسخة الملف ماهيش متوافقة مع هالتطبيق");
  }
  if (!isValidQuit(data.quit, now)) return fail("بيانات الملف فيها خطأ");

  return {
    ok: true,
    value: { quit: pickQuit(data.quit), beaten: sanitizeCount(data.beaten) },
  };
}
