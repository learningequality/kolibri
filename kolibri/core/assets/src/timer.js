/**
 * Fires function based on interval
 * @module timer
 */

class Timer {
  constructor() {
    this.intervalTimer = null;
    this.startTime = null;
    this.timeElapsed = 0;
  }

  /*
   * Stop interval timer- returns time elapsed
   */
  stopTimer() {
    this.updateTime();
    clearInterval(this.intervalTimer);
    this.startTime = null;
  }

  resetTimer() {
    this.timeElapsed = 0;
    this.startTime = new Date();
  }

  getTimeElapsed() {
    this.updateTime();
    return this.timeElapsed;
  }

  updateTime() {
    if (this.startTime) {
      this.timeElapsed += new Date() - this.startTime;
      this.startTime = new Date();
    }
  }

  /*
   * Start interval timer
   * @param {int} intervalTime
   * @param {function} intervalAction
  */
  startTimer(intervalTime, intervalAction) {
    // Stop any intervals that are already going
    if (this.intervalTimer) {
      this.stopTimer();
      this.resetTimer();
    }
    this.intervalTimer = setInterval(intervalAction, intervalTime);
    this.startTime = new Date();
    return this.startTime;
  }
}

module.exports = new Timer();
