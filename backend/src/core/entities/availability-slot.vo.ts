/** Immutable time interval used by schedule scoring. */
export class AvailabilitySlot {
  public readonly start: Date;

  public readonly end: Date;

  constructor(start: Date | string | number, end: Date | string | number) {
    this.start = new Date(start);
    this.end = new Date(end);

    if (Number.isNaN(this.start.getTime()) || Number.isNaN(this.end.getTime())) {
      throw new Error('AvailabilitySlot requires valid start and end dates');
    }

    if (this.end <= this.start) {
      throw new Error('AvailabilitySlot end must be after start');
    }
  }

  public overlaps(other: AvailabilitySlot): boolean {
    return this.start < other.end && other.start < this.end;
  }

  public intersect(other: AvailabilitySlot): AvailabilitySlot | null {
    if (!this.overlaps(other)) {
      return null;
    }

    return new AvailabilitySlot(
      Math.max(this.start.getTime(), other.start.getTime()),
      Math.min(this.end.getTime(), other.end.getTime()),
    );
  }

  public durationMinutes(): number {
    return (this.end.getTime() - this.start.getTime()) / 60_000;
  }
}
