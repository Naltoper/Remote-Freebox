import { AppState, type AppStateStatus, Platform } from 'react-native';

import { PASSIVE_WAIT_MS } from '../config/defaults';
import { loadAutomationSettings, runScheduledAutomation } from './automation';
import { msUntilNextAutomationWake } from '../utils/timeWindow';

type SchedulerState = {
  timer: ReturnType<typeof setTimeout> | null;
  appStateSub: { remove: () => void } | null;
  running: boolean;
};

const state: SchedulerState = {
  timer: null,
  appStateSub: null,
  running: false,
};

function clearTimer() {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

async function nextDelayMs(): Promise<number> {
  try {
    const automation = await loadAutomationSettings();
    return msUntilNextAutomationWake(
      new Date(),
      automation.windowStart,
      automation.windowEnd,
      automation.intervalMinutes,
      PASSIVE_WAIT_MS,
    );
  } catch {
    return PASSIVE_WAIT_MS;
  }
}

async function tick() {
  if (!state.running) return;
  try {
    await runScheduledAutomation();
  } catch (error) {
    console.warn('[AutomationScheduler] tick failed', error);
  }
  if (!state.running) return;
  const delay = await nextDelayMs();
  clearTimer();
  state.timer = setTimeout(() => {
    void tick();
  }, delay);
}

function onAppStateChange(next: AppStateStatus) {
  if (!state.running) return;
  if (next === 'active') {
    clearTimer();
    state.timer = setTimeout(() => {
      void tick();
    }, 1500);
  }
}

export async function startInProcessScheduler(): Promise<void> {
  if (state.running) return;
  state.running = true;

  if (!state.appStateSub) {
    state.appStateSub = AppState.addEventListener('change', onAppStateChange);
  }

  clearTimer();
  state.timer = setTimeout(() => {
    void tick();
  }, Platform.OS === 'android' ? 2500 : 1500);
}

export async function stopInProcessScheduler(): Promise<void> {
  state.running = false;
  clearTimer();
  if (state.appStateSub) {
    state.appStateSub.remove();
    state.appStateSub = null;
  }
}

export function isInProcessSchedulerRunning(): boolean {
  return state.running;
}
