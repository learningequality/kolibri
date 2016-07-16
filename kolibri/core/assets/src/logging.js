/**
 * Provides thin wrapper around loglevel to allow a Python like interface for logging.
 * @module logging
 */

const logging = require('loglevel');

class Logger {
  constructor(loggerName) {
    this.loggerName = loggerName;
    this.logger = logging.getLogger(loggerName);
    Object.keys(logging.levels).forEach((methodName) => {
      const name = methodName.toLowerCase();
      this[name] = (msg) => this.logger[name](this.formatMessage(msg, name));
    });
  }

  formatMessage(msg, type) {
    return `[${new Date()} ${type.toUpperCase()}: ${this.loggerName}] ${msg}`;
  }

  setLevel(level, persist) {
    this.logger.setLevel(level, persist);
  }

  setDefaultLevel(level) {
    this.logger.setDefaultLevel(level);
  }

  enableAll(persist) {
    this.logger.enableAll(persist);
  }

  disableAll(persist) {
    this.logger.disableAll(persist);
  }
}

class Logging {
  constructor() {
    this.registeredLoggers = {};
    this.defaultLogger = new Logger('root');
  }

  trace(msg) {
    this.defaultLogger.trace(msg);
  }

  debug(msg) {
    this.defaultLogger.debug(msg);
  }

  info(msg) {
    this.defaultLogger.info(msg);
  }

  warn(msg) {
    this.defaultLogger.warn(msg);
  }

  error(msg) {
    this.defaultLogger.error(msg);
  }

  getLogger(loggerName) {
    if (!loggerName) {
      return this.defaultLogger;
    }
    if (this.registeredLoggers[loggerName]) {
      return this.registeredLoggers[loggerName];
    }
    const logger = new Logger(loggerName);
    this.registeredLoggers[loggerName] = logger;
    return logger;
  }

  callAllLoggersOrNamed(args, methodName, loggerName) {
    if (!loggerName) {
      logging[methodName](...args);
      Object.keys(this.registeredLoggers).forEach(
        (name) => this.registeredLoggers[name][methodName](...args));
    } else {
      this.registeredLoggers[loggerName][methodName](...args);
    }
  }

  setLevel(level, persist, loggerName) {
    this.callAllLoggersOrNamed([level, persist], 'setLevel', loggerName);
  }

  setDefaultLevel(level, loggerName) {
    this.callAllLoggersOrNamed([level], 'setDefaultLevel', loggerName);
  }

  enableAll(persist) {
    this.callAllLoggersOrNamed([persist], 'enableAll');
  }

  disableAll(persist) {
    this.callAllLoggersOrNamed([persist], 'disableAll');
  }
}

module.exports = new Logging();
