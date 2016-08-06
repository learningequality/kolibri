/**
 * Fires function based on interval
 * @module timer
 */

class Timer {
  constructor() {
    this.intervalTimer = null;
    this.startTime = null;
  }

  /*
   * Stop interval timer- returns time elapsed
   */
  stopTimer() {
    const timeElapsed = new Date() - this.startTime;
    clearInterval(this.intervalTimer);
    this.intervalTimer = null;
    return timeElapsed;
  }

  getTimeElapsed() {
    return new Date() - this.startTime;
  }

  /*
   * Start interval timer
   * @param {int} intervalTime
   * @param {function} intervalAction
  */
  startTimer(intervalTime, intervalAction) {
    if (this.intervalTimer) {
      throw new Error('ERROR: Cannot have multiple timers running at the same time!');
    }
    this.intervalTimer = setInterval(intervalAction, intervalTime);
    this.startTime = new Date();
    return this.startTime;
  }
}

module.exports = new Timer();
