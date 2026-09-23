/**
 * §9 — the player is an independent system: position, lane/column movement
 * state, character model, animation, collision representation. No UI, no
 * traffic, no world-gen, no save access — events/callbacks only.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import type { CharacterFactory } from './CharacterFactory';

export type MoveDir = 'forward' | 'backward' | 'left' | 'right' | 'jump';

export interface PlayerEvents {
  onHopStart?: () => void;
  onStep?: () => void;
  onLand?: () => void;
  onBlocked?: () => void;
}

export class Player {
  group: THREE.Group;
  lane = 0;
  column = Math.floor(GAME_CONFIG.columns / 2);
  moves: MoveDir[] = [];
  stepStart: number | null = null;
  moving = false;
  dying = false;
  squashAt = 0;
  /** World-space character scale tuned for the elevated diorama camera. */
  static readonly SCALE = 1.3;

  private readonly factory: CharacterFactory;
  private readonly events: PlayerEvents;

  constructor(factory: CharacterFactory, events: PlayerEvents = {}) {
    this.factory = factory;
    this.events = events;
    this.group = factory.create('chicken');
    this.group.position.set(0, 0, 0);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  colToX(column: number): number {
    return (column * GAME_CONFIG.positionWidth + GAME_CONFIG.positionWidth / 2) * GAME_CONFIG.zoom
      - (GAME_CONFIG.positionWidth * GAME_CONFIG.columns * GAME_CONFIG.zoom) / 2;
  }

  laneToY(lane: number): number {
    return lane * GAME_CONFIG.positionWidth * GAME_CONFIG.zoom;
  }

  rebuild(characterId: string): void {
    const parent = this.group.parent;
    const pos = this.group.position.clone();
    const rot = this.group.rotation.clone();
    if (parent) parent.remove(this.group);
    this.group = this.factory.create(characterId);
    this.group.position.copy(pos);
    this.group.rotation.copy(rot);
    if (parent) parent.add(this.group);
  }

  reset(lane: number, column: number): void {
    this.lane = lane;
    this.column = column;
    this.moves = [];
    this.stepStart = null;
    this.moving = false;
    this.dying = false;
    this.squashAt = 0;
    this.group.rotation.set(0, 0, 0);
    this.group.scale.setScalar(Player.SCALE);
    this.group.position.set(this.colToX(column), this.laneToY(lane), 0);
  }

  /**
   * Queue a grid step. The target cell is validated against the
   * authoritative world occupancy (Lane.occupied, set at chunk generation):
   * a blocked target rejects the move — the logical position never enters
   * it, no animation plays, only the onBlocked feedback fires.
   */
  queueMove(dir: MoveDir, maxQueue = 3, isBlocked?: (lane: number, col: number) => boolean): boolean {
    if (this.dying) return false;
    if (this.moves.length >= maxQueue) return false;
    // Clamp so queued moves can never leave the board.
    let lane = this.lane;
    let col = this.column;
    for (const m of this.moves) {
      if (m === 'forward') lane++;
      else if (m === 'backward') lane--;
      else if (m === 'left') col--;
      else if (m === 'right') col++;
      else lane += 2; // queued jump
    }
    if (dir === 'forward') lane++;
    else if (dir === 'backward') { if (lane <= 0) return false; lane--; }
    else if (dir === 'left') { if (col <= 0) return false; col--; }
    else { if (col >= GAME_CONFIG.columns - 1) return false; col++; }
    if (isBlocked?.(lane, col)) {
      this.events.onBlocked?.();
      return false;
    }
    this.moves.push(dir);
    return true;
  }

  /**
   * Queue a two-lane forward leap over a jumpable obstacle. The intermediate
   * cell may be occupied only when explicitly jumpable; the landing cell
   * must always be free. Rejected jumps behave exactly like blocked moves
   * (no commit, no animation, onBlocked feedback only).
   */
  queueJump(
    isBlocked?: (lane: number, col: number) => boolean,
    isJumpable?: (lane: number, col: number) => boolean,
    maxQueue = 3,
  ): boolean {
    if (this.dying) return false;
    if (this.moves.length >= maxQueue) return false;
    let lane = this.lane;
    let col = this.column;
    for (const m of this.moves) {
      if (m === 'forward') lane++;
      else if (m === 'backward') lane--;
      else if (m === 'left') col--;
      else if (m === 'right') col++;
      else lane += 2;
    }
    const mid = lane + 1;
    const landing = lane + 2;
    if (col < 0 || col >= GAME_CONFIG.columns) return false;
    if (isBlocked?.(landing, col)) {
      this.events.onBlocked?.();
      return false;
    }
    if (isBlocked?.(mid, col) && !isJumpable?.(mid, col)) {
      this.events.onBlocked?.();
      return false;
    }
    this.moves.push('jump');
    return true;
  }

  /** Advances the hop animation. Returns completed step info or null. */
  step(nowMs: number, reducedMotion: boolean, externalTarget?: { x: number; y: number }): { dir: MoveDir } | null {
    if (this.moves.length && this.stepStart === null) {
      this.stepStart = nowMs;
      this.moving = true;
      this.events.onHopStart?.();
    }
    if (this.stepStart === null || !this.moves.length) return null;
    const dir = this.moves[0];
    const isJump = dir === 'jump';
    // A jump covers two lanes in one arc and peaks above the traffic
    // collision plane, so leaping over vehicles works naturally.
    const dur = isJump ? GAME_CONFIG.stepTimeMs * 1.4 : GAME_CONFIG.stepTimeMs;
    const prog = Math.min((nowMs - this.stepStart) / dur, 1);
    const dist = prog * GAME_CONFIG.positionWidth * GAME_CONFIG.zoom * (isJump ? 2 : 1);
    const jump = Math.sin(prog * Math.PI) * (reducedMotion ? 3 : isJump ? 16 : 8) * GAME_CONFIG.zoom;
    if (dir === 'forward' || isJump) {
      this.group.position.y = this.laneToY(this.lane) + dist;
      this.group.position.z = jump;
      if (externalTarget) externalTarget.y = this.group.position.y;
    } else if (dir === 'backward') {
      this.group.position.y = this.laneToY(this.lane) - dist;
      this.group.position.z = jump;
      if (externalTarget) externalTarget.y = this.group.position.y;
    } else if (dir === 'left') {
      this.group.position.x = this.colToX(this.column) - dist;
      this.group.position.z = jump;
      if (externalTarget) externalTarget.x = this.group.position.x;
    } else {
      this.group.position.x = this.colToX(this.column) + dist;
      this.group.position.z = jump;
      if (externalTarget) externalTarget.x = this.group.position.x;
    }
    const body = this.group.userData.body as THREE.Object3D | undefined;
    if (body && !reducedMotion) body.scale.y = 1 + Math.sin(prog * Math.PI) * 0.08;
    if (prog >= 1) {
      if (dir === 'forward') this.lane++;
      else if (isJump) this.lane += 2;
      else if (dir === 'backward') this.lane--;
      else if (dir === 'left') this.column--;
      else this.column++;
      this.moves.shift();
      this.squashAt = nowMs;
      this.events.onLand?.();
      this.stepStart = this.moves.length ? nowMs : null;
      if (this.moves.length) this.events.onStep?.();
      else this.moving = false;
      return { dir };
    }
    return null;
  }

  halfWidth(): number {
    return 11 * GAME_CONFIG.zoom;
  }

  updateIdle(nowMs: number, reducedMotion: boolean): void {
    const u = this.group.userData as Record<string, unknown>;
    const body = u.body as THREE.Object3D | undefined;
    if (!body) return;
    let squash = 1;
    if (this.squashAt && !reducedMotion) {
      const e = (nowMs - this.squashAt) / 180;
      if (e < 1) squash = 1 - Math.sin(e * Math.PI) * 0.18;
      else this.squashAt = 0;
    }
    if (!this.moving) {
      let breathe = 1;
      if (!reducedMotion) {
        const idle = u.idle as string | undefined;
        if (idle === 'breathe') breathe = 1 + Math.sin(nowMs / 430) * 0.03;
        else if (idle !== 'mech') breathe = 1 + Math.sin(nowMs / 380) * 0.02;
      }
      body.scale.set(1, 1, squash * breathe);
      if (!reducedMotion) this.factory.animate(this.group, nowMs);
    }
    if (this.dying) {
      this.group.rotation.z = Math.min(Math.PI / 2, this.group.rotation.z + 0.15);
      body.scale.set(1.25, 1.25, 0.35);
    } else {
      this.group.rotation.z = 0;
    }
  }
}
