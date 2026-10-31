/**
 * מד החשאיות: שלושה פעמונים שקטים. כל צעד שגוי מצלצל באחד. כשהשלישי מצלצל
 * השומר מתעורר והחדר מתאפס - אין "נגמר המשחק", רק חזרה להתחלה.
 * הטעויות נספרות לאורך כל השלב (גם אחרי איפוס), כי מהן נגזרים הכוכבים.
 */
export type RingResult = 'quiet' | 'warning' | 'wake';

export class StealthMeter {
  readonly max = 3;
  left = 3;
  mistakes = 0;

  ring(): RingResult {
    this.mistakes++;
    this.left = Math.max(0, this.left - 1);
    if (this.left === 0) return 'wake';
    return this.left === 1 ? 'warning' : 'quiet';
  }

  /** אחרי שהשומר נרדם שוב - הפעמונים מתמלאים, הטעויות נשארות */
  refill(): void {
    this.left = this.max;
  }

  stars(hinted: boolean): 1 | 2 | 3 {
    if (this.mistakes === 0 && !hinted) return 3;
    if (this.mistakes <= 2) return 2;
    return 1;
  }
}
