/**
 * כל קבצי המדיה עוברים דרך Vite (import), כך שהנתיבים נכונים גם כשהמשחק
 * רץ לבד וגם בתוך הפורטל, והשם כולל hash - ה-cache-busting מגיע בחינם.
 * המקור: art-src/ -> `npm run assets` -> src/media/.
 */
import tile from './media/tiles/tile.webp';
import tileGood from './media/tiles/tile-good.webp';
import tileWrong from './media/tiles/tile-wrong.webp';
import tileGlow from './media/tiles/tile-glow.webp';
import animGood from './media/tiles/anim-good.webp';
import animWrong from './media/tiles/anim-wrong.webp';
import animGlow from './media/tiles/anim-glow.webp';

import catIdle from './media/sprites/cat-idle.webp';
import catCreep from './media/sprites/cat-creep.webp';
import catLeap from './media/sprites/cat-leap.webp';
import catStartled from './media/sprites/cat-startled.webp';
import catPuzzled from './media/sprites/cat-puzzled.webp';
import catCelebrate from './media/sprites/cat-celebrate.webp';
import doorClosed from './media/sprites/door-closed.webp';
import doorOpen from './media/sprites/door-open.webp';
import bell from './media/sprites/bell.webp';
import eye from './media/sprites/eye.webp';
import magnifier from './media/sprites/magnifier.webp';
import banner from './media/sprites/banner.webp';
import floor from './media/bg/chamber-floor.webp';

import floorVideo from './media/video/floor-awaken.mp4';
import pounceVideo from './media/video/cat-pounce.mp4';
import pouncePoster from './media/video/cat-pounce.webp';

import step_valid from './media/audio/step_valid.mp3';
import step_invalid from './media/audio/step_invalid.mp3';
import correct_answer from './media/audio/correct_answer.mp3';
import door_unlock from './media/audio/door_unlock.mp3';
import alarm_warning from './media/audio/alarm_warning.mp3';
import level_win from './media/audio/level_win.mp3';
import ui_click from './media/audio/ui_click.mp3';
import guard_wake from './media/audio/guard_wake.mp3';
import hint_reveal from './media/audio/hint_reveal.mp3';
import star_pop from './media/audio/star_pop.mp3';
import valve_hiss from './media/audio/valve_hiss.mp3';
import bgm_ambience from './media/audio/bgm_ambience.mp3';

export const IMG = {
  tile,
  tileGood,
  tileWrong,
  tileGlow,
  animGood,
  animWrong,
  animGlow,
  catIdle,
  catCreep,
  catLeap,
  catStartled,
  catPuzzled,
  catCelebrate,
  doorClosed,
  doorOpen,
  bell,
  eye,
  magnifier,
  banner,
  floor,
  pouncePoster,
};

export const VIDEO = { floor: floorVideo, pounce: pounceVideo };

export const SFX = {
  step_valid,
  step_invalid,
  correct_answer,
  door_unlock,
  alarm_warning,
  level_win,
  ui_click,
  guard_wake,
  hint_reveal,
  star_pop,
  valve_hiss,
};
export type SfxName = keyof typeof SFX;
export const BGM = bgm_ambience;

/** מספר הפריימים בכל רצועת אנימציה (ראו TILE_ANIMS ב-prepare_assets.py) */
export const ANIM_FRAMES = { good: 12, wrong: 24, glow: 12 } as const;
