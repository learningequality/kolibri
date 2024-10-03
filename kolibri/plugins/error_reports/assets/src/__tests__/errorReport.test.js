import client from 'kolibri.client';
import urls from 'kolibri.urls';
import {
  report,
  VueErrorReport,
  JavascriptErrorReport,
  UnhandledRejectionErrorReport,
} from '../utils';

/* eslint-env jest */
jest.mock('kolibri.urls', () => ({
  'kolibri:kolibri.plugins.error_reports:report': jest.fn(),
}));
jest.mock('kolibri.client', () => jest.fn());

describe('Error Report', () => {
  beforeEach(() => {
    urls['kolibri:kolibri.plugins.error_reports:report'].mockReturnValue(
      '/error_reports/api/report'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call /error_reports/api/report with VueErrorReport data', () => {
    const vueError = new Error('Vue error');
    vueError.stack = 'My stack trace';
    const vm = { $options: { name: 'TestComponent' } };
    const errorReport = new VueErrorReport(vueError, vm);

    const expectedData = {
      error_message: 'Vue error',
      traceback: 'My stack trace',
      context: {
        ...errorReport.getContext(),
        component: 'TestComponent',
      },
    };

    report(errorReport);

    expect(client).toHaveBeenCalledWith({
      url: '/error_reports/api/report',
      method: 'post',
      data: expectedData,
    });
  });

  it('should call /error_reports/api/report with JavascriptErrorReport data', () => {
    const jsErrorEvent = {
      error: new Error('Javascript error'),
    };
    jsErrorEvent.error.stack = 'My stack trace';

    const errorReport = new JavascriptErrorReport(jsErrorEvent);

    const expectedData = {
      error_message: 'Javascript error',
      traceback: 'My stack trace',
      context: errorReport.getContext(),
    };

    report(errorReport);

    expect(client).toHaveBeenCalledWith({
      url: '/error_reports/api/report',
      method: 'post',
      data: expectedData,
    });
  });

  it('should call /error_reports/api/report with UnhandledRejectionErrorReport data', () => {
    const rejectionEvent = {
      reason: new Error('Unhandled rejection'),
    };
    rejectionEvent.reason.stack = 'My stack trace';

    const errorReport = new UnhandledRejectionErrorReport(rejectionEvent);

    const expectedData = {
      error_message: 'Unhandled rejection',
      traceback: 'My stack trace',
      context: errorReport.getContext(),
    };

    report(errorReport);

    expect(client).toHaveBeenCalledWith({
      url: '/error_reports/api/report',
      method: 'post',
      data: expectedData,
    });
  });
});
