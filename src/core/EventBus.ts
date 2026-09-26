/** Lightweight typed event bus — systems communicate through events, never direct coupling. */

export type GameEventName =
  | 'gameStarted'
  | 'gamePaused'
  | 'gameResumed'
  | 'playerHit'
  | 'playerMoved'
  | 'coinCollected'
  | 'missionCompleted'
  | 'achievementUnlocked'
  | 'worldLoaded'
  | 'worldIntroStarted'
  | 'worldIntroFinished'
  | 'gameOver'
  | 'characterSelected'
  | 'worldSelected'
  | 'worldUnlocked'
  | 'settingsChanged'
  | 'nearMiss'
  | 'powerCollected'
  | 'powerActivated'
  | 'powerEnded'
  | 'worldEventStarted'
  | 'worldEventEnded'
  | 'worldEventWarning';

export type EventHandler = (payload?: unknown) => void;

export class EventBus {
  private handlers = new Map<GameEventName, Set<EventHandler>>();

  on(event: GameEventName, handler: EventHandler): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  emit(event: GameEventName, payload?: unknown): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of [...set]) {
      try {
        h(payload);
      } catch (err) {
        console.error(`CROSS! event handler failed (${event}):`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
