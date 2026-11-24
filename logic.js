// منطق خالص بلا أي DOM أو تخزين: يسهل اختباره وتغييره
import { DAY_MS, HOUR_MS, MINUTE_MS } from "./config.js";
import { BADGES, MILESTONES, MOTIVATION, TIPS } from "./content.js";

export function computeStats(quit, now = Date.now()) {
  const elapsed = Math.max(0, now - quit.start);
  const days = elapsed / DAY_MS;
  const cigarettes = days * quit.cpd;
  const packs = cigarettes / quit.per;
  return {
    elapsed,
    days,
    dayCount: Math.floor(days),
    hours: Math.floor(elapsed / HOUR_MS) % 24,
    minutes: Math.floor(elapsed / MINUTE_MS) % 60,
    seconds: Math.floor(elapsed / 1000) % 60,
    cigarettes: Math.floor(cigarettes),
    packs,
    money: packs * quit.price,
  };
}

export function milestoneStates(elapsed) {
  return MILESTONES.map((m) => {
    const progress = Math.min(1, elapsed / m.ms);
    return { ...m, progress, done: progress >= 1 };
  });
}

export function badgeStates(days) {
  return BADGES.map((b) => ({ ...b, unlocked: days >= b.days }));
}

// يرجع الشارة الجاية ونسبة التقدّم نحوها بين الشارة اللي قبلها والجاية
export function nextBadge(days) {
  const index = BADGES.findIndex((b) => days < b.days);
  if (index === -1) return { next: null, fraction: 1 };
  const next = BADGES[index];
  const prev = index === 0 ? 0 : BADGES[index - 1].days;
  return { next, fraction: (days - prev) / (next.days - prev) };
}

// رسالة ثابتة طول النهار، تتبدّل كل يوم، ما تتبدّلش كل ثانية
export function motivationFor(now = Date.now()) {
  return MOTIVATION[Math.floor(now / DAY_MS) % MOTIVATION.length];
}

// يرجع فهرس نصيحة عشوائية مختلفة عن السابقة
export function nextTip(last = -1) {
  if (TIPS.length === 1) return 0;
  let index;
  do {
    index = Math.floor(Math.random() * TIPS.length);
  } while (index === last);
  return index;
}
