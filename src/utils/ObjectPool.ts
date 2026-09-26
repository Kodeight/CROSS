/** Tiny generic object pool for frequently recycled runtime objects. */

export class ObjectPool<T> {
  private free: T[] = [];
  private activeCount = 0;

  constructor(private readonly factory: () => T, private readonly reset: (item: T) => void, prewarm = 0) {
    for (let i = 0; i < prewarm; i++) this.free.push(factory());
  }

  acquire(): T {
    const item = this.free.pop() ?? this.factory();
    this.activeCount++;
    return item;
  }

  release(item: T): void {
    this.reset(item);
    this.free.push(item);
    this.activeCount = Math.max(0, this.activeCount - 1);
  }

  get active(): number {
    return this.activeCount;
  }

  get spare(): number {
    return this.free.length;
  }
}
