// جلسة الرغبة: دورة التنفّس والعدّ التنازلي. تعرف الوقت فقط، وتبلّغ الواجهة عن طريق الدوال
import { BREATH_PHASES, CRAVING_SECONDS } from "./config.js";

export function createCravingSession({ onPhase, onTick, onEnd }) {
  let remaining = CRAVING_SECONDS;
  let phaseIndex = -1;
  let phaseTimer = null;
  let tickTimer = null;

  function runPhase() {
    phaseIndex = (phaseIndex + 1) % BREATH_PHASES.length;
    const phase = BREATH_PHASES[phaseIndex];
    onPhase(phase);
    phaseTimer = setTimeout(runPhase, phase.seconds * 1000);
  }

  function stop() {
    clearTimeout(phaseTimer);
    clearInterval(tickTimer);
    phaseTimer = null;
    tickTimer = null;
  }

  function start() {
    stop();
    remaining = CRAVING_SECONDS;
    phaseIndex = -1;
    onTick(remaining);
    runPhase();
    tickTimer = setInterval(() => {
      remaining -= 1;
      onTick(Math.max(0, remaining));
      if (remaining <= 0) {
        stop();
        onEnd();
      }
    }, 1000);
  }

  return { start, stop };
}
