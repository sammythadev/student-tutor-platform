export interface HeapItem<T> {
  value: T;
  priority: number;
}

/** Small max-heap implementation used by assignment and top-k ranking. */
export class MaxHeap<T> {
  private readonly items: HeapItem<T>[] = [];

  public get size(): number {
    return this.items.length;
  }

  public push(value: T, priority: number): void {
    this.items.push({ value, priority });
    this.bubbleUp(this.items.length - 1);
  }

  public pop(): HeapItem<T> | null {
    if (this.items.length === 0) {
      return null;
    }

    const first = this.items[0];
    const last = this.items.pop();

    if (this.items.length > 0 && last) {
      this.items[0] = last;
      this.bubbleDown(0);
    }

    return first;
  }

  private bubbleUp(index: number): void {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      if (this.items[parentIndex].priority >= this.items[currentIndex].priority) {
        return;
      }

      this.swap(parentIndex, currentIndex);
      currentIndex = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    let currentIndex = index;

    while (true) {
      const leftIndex = currentIndex * 2 + 1;
      const rightIndex = currentIndex * 2 + 2;
      let largestIndex = currentIndex;

      if (
        leftIndex < this.items.length &&
        this.items[leftIndex].priority > this.items[largestIndex].priority
      ) {
        largestIndex = leftIndex;
      }

      if (
        rightIndex < this.items.length &&
        this.items[rightIndex].priority > this.items[largestIndex].priority
      ) {
        largestIndex = rightIndex;
      }

      if (largestIndex === currentIndex) {
        return;
      }

      this.swap(currentIndex, largestIndex);
      currentIndex = largestIndex;
    }
  }

  private swap(leftIndex: number, rightIndex: number): void {
    const left = this.items[leftIndex];
    this.items[leftIndex] = this.items[rightIndex];
    this.items[rightIndex] = left;
  }
}
