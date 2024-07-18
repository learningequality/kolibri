import { browser, os, device, isTouchDevice } from './browserInfo';

class ErrorReport {
  constructor(e) {
    this.e = e;
    this.context = this.getContext();
  }

  getErrorReport() {
    throw new Error('getErrorReport() method must be implemented.');
  }

  getContext() {
    return {
      browser: browser,
      os: os,
      device: {
        ...device,
        is_touch_device: isTouchDevice,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          available_width: window.screen.availWidth,
          available_height: window.screen.availHeight,
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
        ...this.context,
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
      context: this.context,
    };
  }
}

export class UnhandledRejectionErrorReport extends ErrorReport {
  getErrorReport() {
    return {
      error_message: this.e.reason.message,
      traceback: this.e.reason.stack,
      context: this.context,
    };
  }
}
