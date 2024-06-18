import urls from 'kolibri.urls';
import Resource from '../errorReport';

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

  it('should call api/core/report with the error message and traceback', () => {
    const error = new Error('My error');
    error.stack = 'My stack trace';

    const expectedData = {
      error_message: 'My error',
      traceback: 'My stack trace',
    };

    Resource.client = jest.fn();

    Resource.report(error);

    expect(Resource.client).toHaveBeenCalledWith({
      url: '/api/core/report',
      method: 'post',
      data: expectedData,
    });
  });
});
