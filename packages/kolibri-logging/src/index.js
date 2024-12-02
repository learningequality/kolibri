/**
 * Provides thin wrapper around loglevel to allow a Python like interface for logging.
 * @module logging
 */

const loglevel = require('loglevel');

const logMethodNames = ['trace', 'debug', 'log', 'info', 'warn', 'error'];

class Logger {
  constructor(loggerName) {
    this.loggerName = loggerName;
    this.logger = loglevel.getLogger(loggerName);
    this.logColors = {};
    if (!process.browser) {
      const chalk = require('chalk');
      this.logColors = {
        log: chalk.white,
        info: chalk.green,
        warn: chalk.yellow,
        error: chalk.red,
      };
    }
    this.setMessagePrefix();
    for (const name of logMethodNames) {
      const logFunction = this.logger[name];
      if (logFunction) {
        this[name] = (...params) => {
          return this.logger[name](...params);
        };
      }
    }
  }

  setMessagePrefix() {
    var originalFactory = this.logger.methodFactory;
    var self = this;
    this.logger.methodFactory = function (methodName, logLevel, loggerName) {
      var rawMethod = originalFactory(methodName, logLevel, loggerName);
      var colorMethod = self.logColors[methodName] || (msg => msg);
      return function (message, ...args) {
        rawMethod(colorMethod(`[${methodName.toUpperCase()}: ${loggerName}] ` + message), ...args);
      };
    };
    this.logger.setLevel(this.logger.getLevel());
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
    for (const name of logMethodNames) {
      this[name] = (...msgs) => this.defaultLogger[name](...msgs);
    }
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
        this.registeredLoggers[name][methodName](...args),
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

module.exports = logging;
