import { browser, os, deviceWithTouch } from './browserInfo';

class ErrorReport {
  constructor(e) {
    this.e = e;
  }

  getErrorReport() {
    throw new Error('getErrorReport() method must be implemented.');
  }

  getContext() {
    return {
      browser: browser,
      os: os,
      device: {
        ...deviceWithTouch,
        screen: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    };
  }
}

export class VueErrorReport extends ErrorReport {
  constructor(e, vm) {
    super(e);
    this.vm = vm;
  }
  getErrorReport() {
    return {
      error_message: this.e.message,
      traceback: this.e.stack,
      context: {
        ...this.getContext(),
        component: this.vm.$options.name || this.vm.$options._componentTag || 'Unknown Component',
      },
    };
  }
}

export class JavascriptErrorReport extends ErrorReport {
  getErrorReport() {
    return {
      error_message: this.e.error.message,
      traceback: this.e.error.stack,
      context: this.getContext(),
    };
  }
}

export class UnhandledRejectionErrorReport extends ErrorReport {
  getErrorReport() {
    return {
      error_message: this.e.reason.message,
      traceback: this.e.reason.stack,
      context: this.getContext(),
    };
  }
}
