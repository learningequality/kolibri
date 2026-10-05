import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTranslator } from 'kolibri/utils/i18n';
import DownloadButton from '../DownloadButton';
import { getFilePresetString } from '../internal/filePresetStrings';

const { downloadContent$ } = createTranslator(DownloadButton.name, DownloadButton.$trs);

jest.mock('kolibri/urls');
jest.mock('kolibri', () => ({
  __esModule: true,
  default: { presetViewerComponent: () => true },
}));

const files = [
  {
    file_size: 100000,
    preset: 'high_res_video',
    extension: 'mp4',
    checksum: '3893fd801427402ad07487c5d2d35119',
    storage_url: '/content/storage/video.mp4',
    available: true,
  },
  {
    file_size: 500,
    preset: 'document',
    extension: 'pdf',
    checksum: '187598e1f4596bf4492f5a205922b633',
    storage_url: '/content/storage/doc.pdf',
    available: true,
  },
];

describe('DownloadButton', () => {
  let click;
  let clickedLink;

  beforeEach(() => {
    // Capture the link on click so assertions run in the test body, not inside the handler.
    click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clickedLink = this;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not render when there are no downloadable files', () => {
    render(DownloadButton, { props: { files: [] } });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render when the only files are exercises', () => {
    render(DownloadButton, { props: { files: [{ ...files[0], preset: 'exercise' }] } });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lists an option for each file when opened', async () => {
    render(DownloadButton, { props: { files, nodeTitle: 'My video' } });
    await userEvent.click(screen.getByRole('button', { name: downloadContent$() }));
    const options = await screen.findAllByRole('menu-item');
    expect(options).toHaveLength(files.length);
    files.forEach((file, i) => {
      expect(options[i]).toHaveTextContent(getFilePresetString(file));
    });
  });

  it('downloads the selected file with a name based on the resource title', async () => {
    render(DownloadButton, { props: { files, nodeTitle: 'My video' } });
    await userEvent.click(screen.getByRole('button', { name: downloadContent$() }));
    const options = await screen.findAllByRole('menu-item');
    await userEvent.click(options[1]);
    expect(click).toHaveBeenCalledTimes(1);
    expect(clickedLink.download).toBe('My video (187598).pdf');
    expect(clickedLink).toHaveAttribute('href', '/content/storage/doc.pdf');
  });
});
