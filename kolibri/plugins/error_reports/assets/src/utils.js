import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { browser, os, device, isTouchDevice, screenBreakpoint } from 'kolibri/utils/browserInfo';

export function report(error) {
  const url = urls['kolibri:kolibri.plugins.error_reports:report']();
  const data = error.getErrorReport();
  return client({
    url,
    method: 'post',
    data: data,
  });
}

class ErrorReport {
  constructor(e) {
    this.message = e?.message || 'Unknown Error';
    this.stack = e?.stack || 'No stack trace available';
  }

  getErrorReport() {
    return {
      error_message: this.message,
      traceback: this.stack,
      context: this.getContext(),
    };
  }

  getContext() {
    return {
      browser: browser,
      os: os,
      device: {
        ...device,
        is_touch_device: isTouchDevice,
        screen_breakpoint: screenBreakpoint,
      },
      ...this.getExtraContext(),
    };
  }

  getExtraContext() {
    return {};
  }
}

export class VueErrorReport extends ErrorReport {
  constructor(e, vm) {
    super(e);
    this.vm = vm;
  }
  getExtraContext() {
    return {
      component: this.vm.$options.name || this.vm.$options._componentTag || 'Unknown Component',
    };
  }
}

export class JavascriptErrorReport extends ErrorReport {
  constructor(e) {
    super(e.error || { message: e.message });
  }
}

export class UnhandledRejectionErrorReport extends ErrorReport {
  constructor(e) {
    super(e.reason);
  }
}
