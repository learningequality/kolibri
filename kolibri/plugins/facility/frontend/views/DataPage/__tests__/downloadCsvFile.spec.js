import urls from 'kolibri/urls';
import downloadCsvFile from '../downloadCsvFile';

jest.mock('kolibri/urls');

const CSV_URL = '/facility/api/downloadcsvfile/session/facility-id';

describe('downloadCsvFile', () => {
  let clickedLink;

  beforeEach(() => {
    urls.__setUrl(CSV_URL);
    // The link is removed before the assertions run, so capture it on click.
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clickedLink = this;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('downloads the export by clicking a link', () => {
    downloadCsvFile('session', 'facility-id');

    expect(clickedLink.href).toContain(CSV_URL);
    expect(clickedLink).toHaveAttribute('download', '');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
