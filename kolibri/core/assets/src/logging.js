/**
 * Provides thin wrapper around loglevel to allow a Python like interface for logging.
 * @module logging
 */

import loglevel from 'loglevel';

const console = global.console;

class Logger {
  constructor(loggerName) {
    this.loggerName = loggerName;
    this.logger = loglevel.getLogger(loggerName);
    Object.keys(loglevel.levels).forEach(methodName => {
      const name = methodName.toLowerCase();
      const logFunction = this.logger[name];
      if (logFunction) {
        if (logFunction.bind === 'undefined') {
          // IE < 10
          this[name] = Function.prototype.bind.call(logFunction, console, this.messagePrefix(name));
        } else {
          this[name] = logFunction.bind(console, this.messagePrefix(name));
        }
      }
    });
  }

  messagePrefix(type) {
    return `[${type.toUpperCase()}: ${this.loggerName}]`;
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
    Object.keys(loglevel.levels).forEach(methodName => {
      const name = methodName.toLowerCase();
      this[name] = msg => this.defaultLogger[name](msg);
    });
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
      loglevel[methodName](...args);
      Object.keys(this.registeredLoggers).forEach(name =>
        this.registeredLoggers[name][methodName](...args)
      );
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

const logging = new Logging();

export default logging;
