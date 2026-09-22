/** Explicit game states. UI + gameplay transition through these — never abrupt DOM swaps. */

export enum GameState {
  BOOT = 'BOOT',
  LOADING = 'LOADING',
  MAIN_MENU = 'MAIN_MENU',
  WORLD_INTRO = 'WORLD_INTRO',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  RESULTS = 'RESULTS',
  CHARACTER_SELECT = 'CHARACTER_SELECT',
  WORLD_SELECT = 'WORLD_SELECT',
  SETTINGS = 'SETTINGS',
  MISSIONS = 'MISSIONS',
}

export const MAIN_MENU_FLOW = [
  GameState.MAIN_MENU,
  GameState.WORLD_INTRO,
  GameState.PLAYING,
  GameState.GAME_OVER,
  GameState.RESULTS,
  GameState.MAIN_MENU,
] as const;
