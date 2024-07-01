class ErrorReport {
  constructor(e) {
    this.e = e;
  }

  getErrorReport() {
    throw new Error('getErrorReport() method must be implemented.');
  }
  getDeviceInfo() {
    return {
      type: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      platform: navigator.platform,
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }
  getBrowserInfo() {
    return navigator.userAgent;
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
        component: this.vm.$options.name || this.vm.$options._componentTag || 'Unknown Component',
        browser: this.getBrowserInfo(),
        device: this.getDeviceInfo(),
      },
    };
  }
}

export class JavascriptErrorReport extends ErrorReport {
  getErrorReport() {
    return {
      error_message: this.e.error.message,
      traceback: this.e.error.stack,
      context: {
        browser: this.getBrowserInfo(),
        device: this.getDeviceInfo(),
      },
    };
  }
}

export class UnhandledRejectionErrorReport extends ErrorReport {
  getErrorReport() {
    return {
      error_message: this.e.reason ? this.e.reason.message : 'Unhandled Rejection',
      traceback: this.e.reason ? this.e.reason.stack : 'No stack trace available',
      context: {
        browser: this.getBrowserInfo(),
        device: this.getDeviceInfo(),
      },
    };
  }
}
