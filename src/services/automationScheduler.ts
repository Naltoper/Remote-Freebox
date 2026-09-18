import { AppState, type AppStateStatus, Platform } from 'react-native';

import { loadAutomationSettings, runScheduledAutomation } from './automation';
import { isInTimeWindow } from '../utils/timeWindow';

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
    const inWindow = isInTimeWindow(
      new Date(),
      automation.windowStart,
      automation.windowEnd,
    );
    const minutes = inWindow
      ? automation.intervalMinutes
      : automation.offWindowIntervalMinutes;
    // Keep a sane minimum to avoid hammering the Freebox / draining battery.
    return Math.max(minutes, 1) * 60 * 1000;
  } catch {
    return 15 * 60 * 1000;
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
  // When returning to foreground, run a check sooner.
  if (next === 'active') {
    clearTimer();
    state.timer = setTimeout(() => {
      void tick();
    }, 1500);
  }
}

/**
 * In-process scheduler (no native Foreground Service).
 * Runs while the JS runtime is alive (app open / recent). Complements
 * expo-background-task for OS-scheduled background wakes.
 */
export async function startInProcessScheduler(): Promise<void> {
  if (state.running) return;
  state.running = true;

  if (!state.appStateSub) {
    state.appStateSub = AppState.addEventListener('change', onAppStateChange);
  }

  // First tick deferred so Settings save / UI can finish.
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
