// Service Worker: يخلّي التطبيق يخدم بلا نت.
// ملاحظة للصيانة: عند كل إصدار فيه تغيير في الملفات، غيّر قيمة CACHE (مثلاً naqla-v2.0.1).
// بدونها المتصفح يبقى يخدم النسخة القديمة من الكاش.
const CACHE = "naqla-v2.0.0";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./css/style.css",
  "./js/app.js",
  "./js/config.js",
  "./js/content.js",
  "./js/validate.js",
  "./js/store.js",
  "./js/logic.js",
  "./js/craving.js",
  "./js/telemetry.js",
  "./js/ui.js",
];

// خطوط Google فقط تُخزَّن من خارج الموقع
const CROSS_ORIGIN_OK = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

self.addEventListener("install", (event) => {
  // ما نستدعيوش skipWaiting هنا: المستخدم يقرّر وقت التحديث
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("naqla-") && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CROSS_ORIGIN_OK.has(url.hostname)) return;

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    if (request.mode === "navigate") {
      const shell = await cache.match("./index.html");
      if (shell) return shell;
    }
    return Response.error();
  }
}
