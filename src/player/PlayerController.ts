/**
 * §9 — translates normalized InputManager actions into player moves.
 * The gameplay layer never sees keyboard vs touch.
 */
import type { GameAction, InputManager } from '../core/Input';
import type { Player, MoveDir } from './Player';

export class PlayerController {
  private enabled = false;

  constructor(
    private readonly player: Player,
    private readonly input: InputManager,
    private readonly onPause: () => void,
    private readonly isBlocked?: (lane: number, col: number) => boolean,
    private readonly isJumpable?: (lane: number, col: number) => boolean,
  ) {
    this.input.onAction((a: GameAction) => this.handle(a));
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  private handle(action: GameAction): void {
    if (action === 'PAUSE') {
      this.onPause();
      return;
    }
    if (!this.enabled) return;
    if (action === 'JUMP') {
      this.player.queueJump(this.isBlocked, this.isJumpable);
      return;
    }
    const map: Record<GameAction, MoveDir | null> = {
      MOVE_FORWARD: 'forward',
      MOVE_BACK: 'backward',
      MOVE_LEFT: 'left',
      MOVE_RIGHT: 'right',
      PAUSE: null,
      JUMP: null,
    };
    const dir = map[action];
    if (dir) this.player.queueMove(dir, 3, this.isBlocked);
  }
}
