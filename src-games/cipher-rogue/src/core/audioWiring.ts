import { EventBus } from './EventBus.ts';
import { Sound } from './SoundManager.ts';

/**
 * חיווט אירועים -> צלילים. ההמשך הישיר של `Design.info/EventBus-addition.ts`:
 * מסך הכספת רק משדר מה קרה, ומכאן מחליטים מה נשמע.
 * correct_answer מחליף את step_valid בכל צעד נכון (החלטת אלעד); step_valid נשאר
 * לצעד "ניטרלי" - חזרה על אבן מאושרת, פתיחת שסתום בשלב 9, או אבן בשביל המשוואה
 * (שם הצליל הנכון שמור לרגע שהמאזניים מתאזנים).
 */
let wired = false;

export function wireAudio(): void {
  if (wired) return;
  wired = true;

  EventBus.on('STEP_ON_TILE', ({ kind }) => {
    if (kind === 'valid' || kind === 'valve_close') Sound.play('correct_answer');
    else Sound.play('step_valid', { gain: kind === 'revisit' ? 0.55 : 0.8 });
  });

  EventBus.on('INVALID_MOVE', ({ known }) => Sound.play('step_invalid', { gain: known ? 0.5 : 1 }));

  EventBus.on('STEALTH_CHANGE', ({ left }) => {
    if (left === 1) Sound.play('alarm_warning', { delay: 0.35 });
  });

  EventBus.on('ROOM_RESET', () => Sound.play('guard_wake'));
  EventBus.on('HINT_USED', () => Sound.play('hint_reveal'));
  EventBus.on('VALVE_RELEASE', () => Sound.play('valve_hiss'));

  EventBus.on('LEVEL_COMPLETED', () => {
    Sound.duck(5);
    Sound.play('door_unlock');
    Sound.play('level_win', { delay: 1.15 });
  });
}
