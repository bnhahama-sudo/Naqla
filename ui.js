// طبقة العرض فقط: تكتب في الصفحة وتقرا منها. ما تعرف شي عن التخزين ولا عن القواعد.
const RING_LENGTH = 2 * Math.PI * 90; // نفس نصف القطر في الـ SVG
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const FIELDS = ["start", "cpd", "per", "price"];

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
let toastTimer = null;

// إنشاء عناصر بأمان: النص يتكتب بـ textContent وما يتعالجش كـ HTML
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else if (key === "style") Object.assign(node.style, value);
    else node.setAttribute(key, value);
  }
  node.append(...[].concat(children));
  return node;
}

export function toLocalInput(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function setVersion(version) {
  $("app-version").textContent = `الإصدار ${version}`;
}

export function setScreen(name) {
  $("setup").hidden = name !== "setup";
  $("main").hidden = name !== "main";
  window.scrollTo(0, 0);
}

export function setCancelVisible(visible) {
  $("btn-cancel").hidden = !visible;
}

export function fillForm(quit, now) {
  const q = quit ?? { start: now, cpd: 15, per: 20, price: 7.5 };
  $("f-start").value = toLocalInput(q.start);
  $("f-cpd").value = String(q.cpd);
  $("f-per").value = String(q.per);
  $("f-price").value = String(q.price);
}

export function readForm() {
  return {
    start: $("f-start").value,
    cpd: $("f-cpd").value,
    per: $("f-per").value,
    price: $("f-price").value,
  };
}

export function showErrors(errors) {
  let firstInvalid = null;
  for (const field of FIELDS) {
    const input = $(`f-${field}`);
    const note = $(`e-${field}`);
    const message = errors[field] ?? "";
    note.textContent = message;
    note.hidden = !message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (message && !firstInvalid) firstInvalid = input;
  }
  firstInvalid?.focus();
}

export function renderStats(stats, beaten) {
  const values = {
    dayCount: stats.dayCount,
    hours: pad(stats.hours),
    minutes: pad(stats.minutes),
    seconds: pad(stats.seconds),
    money: stats.money.toFixed(2),
    cigarettes: stats.cigarettes,
    packs: stats.packs.toFixed(1),
    beaten,
  };
  for (const node of document.querySelectorAll("[data-bind]")) {
    const key = node.dataset.bind;
    if (Object.hasOwn(values, key)) node.textContent = String(values[key]);
  }
}

export function setRing(fraction) {
  const ring = $("ring-fg");
  const f = Math.min(1, Math.max(0, fraction));
  ring.style.strokeDasharray = String(RING_LENGTH);
  ring.style.strokeDashoffset = String(RING_LENGTH * (1 - f));
}

export function setNextBadge(text) {
  $("next-badge").textContent = text;
}

export function setMotivation(text) {
  $("motivation").textContent = text;
}

export function renderMilestones(items) {
  $("milestones").replaceChildren(
    ...items.map((m) => {
      const percent = Math.floor(m.progress * 100);
      return el("li", {}, [
        el("div", { class: "row" }, [
          el("span", { text: m.label }),
          el("span", { text: m.done ? "✅" : `${percent}%` }),
        ]),
        el("p", { text: m.text }),
        el(
          "div",
          { class: "bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(percent) },
          [el("i", { style: { width: `${percent}%` } })],
        ),
      ]);
    }),
  );
}

export function renderBadges(items) {
  $("badges").replaceChildren(
    ...items.map((b) =>
      el(
        "div",
        {
          class: b.unlocked ? "badge on" : "badge",
          "aria-label": `${b.label}: ${b.unlocked ? "مفتوحة" : "مقفولة"}`,
        },
        [el("em", { text: b.icon }), el("span", { text: b.label })],
      ),
    ),
  );
}

export function setRelapseOpen(open) {
  $("relapse-card").hidden = !open;
}

export function setTelemetryChecked(on) {
  $("telemetry").checked = on === true;
}

export function setOffline(offline) {
  $("offline").hidden = !offline;
}

export function showUpdate(onApply) {
  $("update").hidden = false;
  $("btn-update").addEventListener("click", onApply, { once: true });
}

export function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.hidden = true;
  }, 3200);
}

export function isCravingOpen() {
  return !$("craving").hidden;
}

export function openCraving(tip) {
  $("tip").textContent = tip;
  $("craving-done").hidden = true;
  $("craving").hidden = false;
  $("btn-close").focus();
}

function resetOrb() {
  const orb = $("orb");
  orb.style.transition = "none";
  orb.style.transform = "scale(0.55)";
  $("phase").textContent = "جاهز؟";
}

export function closeCraving() {
  $("craving").hidden = true;
  resetOrb();
}

export function setBreath(label, seconds, scale) {
  $("phase").textContent = label;
  const orb = $("orb");
  orb.style.transition = reduceMotion.matches ? "none" : `transform ${seconds}s ease-in-out`;
  orb.style.transform = `scale(${scale})`;
}

export function setCountdown(seconds) {
  $("countdown").textContent = `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;
}

export function setTip(text) {
  $("tip").textContent = text;
}

export function showCravingDone() {
  $("craving-done").hidden = false;
}
