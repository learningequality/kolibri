import urls from 'kolibri.urls';
import Resource from '../errorReport';
import {
  VueErrorReport,
  JavascriptErrorReport,
  UnhandledRejectionErrorReport,
} from '../../utils/errorReportUtils';

/* eslint-env jest */
jest.mock('kolibri.urls', () => ({
  'kolibri:core:report': jest.fn(),
}));

describe('Error Report', () => {
  beforeEach(() => {
    urls['kolibri:core:report'].mockReturnValue('/api/core/report');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call api/core/report with VueErrorReport data', () => {
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

    Resource.client = jest.fn();
    Resource.report(errorReport);

    expect(Resource.client).toHaveBeenCalledWith({
      url: '/api/core/report',
      method: 'post',
      data: expectedData,
    });
  });

  it('should call api/core/report with JavascriptErrorReport data', () => {
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

    Resource.client = jest.fn();
    Resource.report(errorReport);

    expect(Resource.client).toHaveBeenCalledWith({
      url: '/api/core/report',
      method: 'post',
      data: expectedData,
    });
  });

  it('should call api/core/report with UnhandledRejectionErrorReport data', () => {
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

    Resource.client = jest.fn();
    Resource.report(errorReport);

    expect(Resource.client).toHaveBeenCalledWith({
      url: '/api/core/report',
      method: 'post',
      data: expectedData,
    });
  });
});
