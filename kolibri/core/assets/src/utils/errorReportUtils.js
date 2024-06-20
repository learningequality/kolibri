class ErrorReport {
  constructor(e) {
    this.e = e;
  }

  getErrorReport() {
    throw new Error('getErrorReport() method must be implemented.');
  }
}

export class VueErrorReport extends ErrorReport {
  getErrorReport() {
    return {
      error_message: this.e.message,
      traceback: this.e.stack,
    };
  }
}

export class JavascriptErrorReport extends ErrorReport {
  getErrorReport() {
    return {
      error_message: this.e.error.message,
      traceback: this.e.error.stack,
    };
  }
}

export class UnhandledRejectionErrorReport extends ErrorReport {
  getErrorReport() {
    return {
      error_message: this.e.reason.message,
      traceback: this.e.reason.stack,
    };
  }
}
