// إعدادات عامة. أي ملف آخر يستورد منا، ما يكتبش قيم مباشرة.

export const APP_VERSION = "2.0.0";

// رقم مخطط البيانات. كل تغيير في شكل البيانات يزيد الرقم ويضاف ترحيل في store.js
export const SCHEMA_VERSION = 2;

export const STORAGE_KEY = "naqla.data";
export const LEGACY_KEY = "qs1"; // مفتاح النسخة الأولى (MVP)، يُقرأ للترحيل فقط

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export const LIMITS = Object.freeze({
  cpd: { min: 1, max: 100 },        // سجائر في اليوم
  per: { min: 1, max: 100 },        // سجائر في الباكو
  price: { min: 0, max: 1000 },     // ثمن الباكو بالدينار
  beaten: { min: 0, max: 100000 },  // عدد الرغبات المغلوبة
});

export const MAX_BACKUP_BYTES = 200 * 1024;
export const CRAVING_SECONDS = 300;

export const BREATH_PHASES = Object.freeze([
  { label: "شهّق من المنخار", seconds: 4, scale: 1 },
  { label: "احبس نفسك", seconds: 7, scale: 1 },
  { label: "ازفر ببطء", seconds: 8, scale: 0.55 },
]);

// ضع رابط خادم القياس هنا عند توفره. إذا بقي null فالقياس معطّل تماماً.
export const TELEMETRY_ENDPOINT = null;
