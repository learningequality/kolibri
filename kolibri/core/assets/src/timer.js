/**
 * Fires function based on interval
 * @module timer
 */

class Timer {
  constructor() {
    this.intervalTimer = null;
    this.startTime = null;
    this.intervalTime = 0;
    this.intervalAction = null;
  }

  /*
   * Stop interval timer- returns time elapsed
   */
  stopTimer() {
    clearInterval(this.intervalTimer);
    this.intervalTimer = null;
  }

  getTimeElapsed() {
    return (new Date() - this.startTime) / 1000;
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
    this.intervalTime = intervalTime;
    this.intervalAction = intervalAction;
    this.intervalTimer = setInterval(this.intervalAction, this.intervalTime);
    this.startTime = new Date();
    return this.startTime;
  }
}

module.exports = new Timer();
