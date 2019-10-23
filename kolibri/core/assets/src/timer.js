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
    this.lastElapsedTimeCheck = null;
  }

  /*
   * Stop interval timer- returns time elapsed
   */
  stopTimer() {
    clearInterval(this.intervalTimer);
    this.intervalTimer = null;
  }

  /*
   * Get time that has elapsed since timer started
   */
  getTimeElapsed() {
    this.lastElapsedTimeCheck = new Date();
    return (this.lastElapsedTimeCheck - this.startTime) / 1000;
  }

  /*
   * Get time that has elapsed since last time elapsed time was checked
   */
  getNewTimeElapsed() {
    // Timer has not been started
    if (!this.lastElapsedTimeCheck) {
      return 0;
    }
    const currentTime = new Date();
    const timeElapsed = (currentTime - this.lastElapsedTimeCheck) / 1000;
    this.lastElapsedTimeCheck = currentTime;
    return timeElapsed;
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
    this.lastElapsedTimeCheck = new Date();
    this.startTime = this.lastElapsedTimeCheck;
    return this.startTime;
  }
}

const timer = new Timer();

export { timer as default };
