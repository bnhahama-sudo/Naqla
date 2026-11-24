// المتحكّم: يربط الواجهة بالمنطق والتخزين. ما فيهش تنسيق ولا قواعد حساب.
import { APP_VERSION } from "./config.js";
import { TIPS } from "./content.js";
import { buildBackup, loadState, saveState } from "./store.js";
import { parseBackup, validateSetup } from "./validate.js";
import { badgeStates, computeStats, milestoneStates, motivationFor, nextBadge, nextTip } from "./logic.js";
import { createCravingSession } from "./craving.js";
import { setTelemetryConsent, track } from "./telemetry.js";
import * as ui from "./ui.js";

const SAVE_FAILED = "ما قدرناش نحفظو البيانات. تأكد من مساحة التخزين في التليفون.";
const $ = (id) => document.getElementById(id);

let state = null;
let craving = null;
let tipIndex = -1;
let applyingUpdate = false;

// كل كتابة تمرّ من هنا: إذا فشل الحفظ ما نغيّرو الحالة في الذاكرة
function commit(next) {
  if (!saveState(next)) {
    ui.toast(SAVE_FAILED);
    return false;
  }
  state = next;
  return true;
}

// ---------- العرض ----------

// يتحدّث كل ثانية: العدّاد والحلقة فقط
function renderClock() {
  if (!state) return;
  const stats = computeStats(state.quit, Date.now());
  ui.renderStats(stats, state.beaten);
  ui.setRing(nextBadge(stats.days).fraction);
}

// يتحدّث عند كل تغيير وكل دقيقة: القوائم والشارات والرسالة
function renderAll() {
  if (!state) return;
  renderClock();
  const now = Date.now();
  const stats = computeStats(state.quit, now);
  const badge = nextBadge(stats.days);
  ui.setNextBadge(badge.next ? `الشارة الجاية: ${badge.next.icon} ${badge.next.label}` : "وصلت لأعلى شارة 👑");
  ui.setMotivation(motivationFor(now));
  ui.renderMilestones(milestoneStates(stats.elapsed));
  ui.renderBadges(badgeStates(stats.days));
}

function showSetup() {
  ui.setCancelVisible(state !== null);
  ui.fillForm(state?.quit ?? null, Date.now());
  ui.showErrors({});
  ui.setScreen("setup");
}

function showMain() {
  ui.setScreen("main");
  ui.setTelemetryChecked(state.telemetry);
  renderAll();
}

// ---------- الأحداث ----------

function onSubmitSetup(event) {
  event.preventDefault();
  const result = validateSetup(ui.readForm());
  ui.showErrors(result.ok ? {} : result.errors);
  if (!result.ok) return;

  const isFirstRun = state === null;
  if (!commit({ quit: result.value, beaten: state?.beaten ?? 0, telemetry: state?.telemetry ?? false })) return;
  if (isFirstRun) track("setup_completed");
  showMain();
}

function onRelapse() {
  if (!commit({ ...state, quit: { ...state.quit, start: Date.now() } })) return;
  ui.setRelapseOpen(false);
  track("relapse_reset");
  renderAll();
  ui.toast("البداية الجديدة بدات توّا 💚");
}

function openCraving() {
  ui.openCraving(TIPS[tipIndex = nextTip(tipIndex)]);
  track("craving_started");
  craving?.stop();
  craving = createCravingSession({
    onPhase: (phase) => ui.setBreath(phase.label, phase.seconds, phase.scale),
    onTick: (seconds) => ui.setCountdown(seconds),
    onEnd: () => ui.showCravingDone(),
  });
  craving.start();
}

function closeCraving() {
  craving?.stop();
  craving = null;
  ui.closeCraving();
}

function onWon() {
  if (!commit({ ...state, beaten: state.beaten + 1 })) return;
  track("craving_won");
  closeCraving();
  renderAll();
  ui.toast("غلبتها! برافو عليك 🎉");
}

function onNextTip() {
  ui.setTip(TIPS[tipIndex = nextTip(tipIndex)]);
}

function onExport() {
  const blob = new Blob([buildBackup(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `naqla-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  track("backup_exported");
}

async function onImport(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;

  const result = parseBackup(await file.text());
  input.value = "";
  if (!result.ok) {
    ui.toast(result.error);
    return;
  }
  if (!window.confirm("البيانات الحالية باش تتبدّل بالنسخة الاحتياطية. تحب تكمّل؟")) return;

  const next = {
    quit: result.value.quit,
    beaten: result.value.beaten,
    telemetry: state?.telemetry ?? false,
  };
  if (!commit(next)) return;
  track("backup_imported");
  showMain();
  ui.toast("تم الاسترجاع 👍");
}

function onTelemetryToggle(event) {
  const on = event.target.checked;
  if (!commit({ ...state, telemetry: on })) {
    event.target.checked = !on;
    return;
  }
  setTelemetryConsent(on);
  ui.toast(on ? "شكراً، القياس المجهول مفعّل" : "تم إيقاف القياس");
}

function bind() {
  $("setup-form").addEventListener("submit", onSubmitSetup);
  $("btn-cancel").addEventListener("click", showMain);
  $("btn-edit").addEventListener("click", showSetup);
  $("btn-craving").addEventListener("click", openCraving);
  $("btn-close").addEventListener("click", closeCraving);
  $("btn-tip").addEventListener("click", onNextTip);
  $("btn-won").addEventListener("click", onWon);
  $("btn-relapse").addEventListener("click", () => ui.setRelapseOpen(true));
  $("btn-relapse-no").addEventListener("click", () => ui.setRelapseOpen(false));
  $("btn-relapse-yes").addEventListener("click", onRelapse);
  $("btn-export").addEventListener("click", onExport);
  $("file-import").addEventListener("change", onImport);
  $("file-import-setup").addEventListener("change", onImport);
  $("telemetry").addEventListener("change", onTelemetryToggle);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ui.isCravingOpen()) closeCraving();
  });
  window.addEventListener("online", () => ui.setOffline(false));
  window.addEventListener("offline", () => ui.setOffline(true));
}

// ---------- Service Worker ----------

// التحديث ما يتطبّقش وحدو: المستخدم يضغط «حدّث الآن» باش ما يضيعش شي وهو يستعمل التطبيق
function offerUpdate(worker) {
  ui.showUpdate(() => {
    applyingUpdate = true;
    worker.postMessage({ type: "SKIP_WAITING" });
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("./sw.js");
    if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (applyingUpdate) window.location.reload();
    });
  } catch (error) {
    console.warn("تعذّر تفعيل وضع بلا نت:", error);
  }
}

// ---------- التشغيل ----------

function init() {
  ui.setVersion(APP_VERSION);
  ui.setOffline(!navigator.onLine);

  state = loadState();
  setTelemetryConsent(state?.telemetry === true);
  bind();

  if (state) showMain();
  else showSetup();

  setInterval(renderClock, 1000);
  setInterval(renderAll, 60_000);
  registerServiceWorker();
}

init();
