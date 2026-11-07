import { render, screen, fireEvent } from '@testing-library/vue';
import { ref } from 'vue';
import QRCode from 'qrcode';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import DonationBanner, {
  TITLE,
  DONATE_LABEL,
  DISMISS_LABEL,
  DISMISS_ARIA_LABEL,
  QR_ALT,
} from '../DonationBanner.vue';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE_QR'),
}));

jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');

function renderBanner(variant) {
  return render(DonationBanner, {
    props: { notification: { id: 2, key: 'donation', variant } },
  });
}

describe('DonationBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall: ref(false) }));
  });

  it.each(['a', 'b'])('links and encodes the donate URL for variant %s', async variant => {
    const url = `https://learningequality.org/donate/?source=kolibri-testversion-banner-${variant}`;
    renderBanner(variant);

    expect(screen.getByRole('heading', { name: TITLE })).toBeInTheDocument();
    const donateLink = screen.getByRole('link', { name: DONATE_LABEL });
    expect(donateLink).toHaveAttribute('href', url);
    expect(donateLink).toHaveAttribute('target', '_blank');
    expect(await screen.findByRole('img', { name: QR_ALT })).toHaveAttribute(
      'src',
      'data:image/png;base64,FAKE_QR',
    );
    expect(QRCode.toDataURL).toHaveBeenCalledWith(url, expect.anything());
  });

  it('encodes a local version segment in the donate URL', () => {
    const version = global.__version;
    global.__version = '0.20.0+git.abc';
    try {
      renderBanner('a');
    } finally {
      global.__version = version;
    }
    expect(screen.getByRole('link', { name: DONATE_LABEL })).toHaveAttribute(
      'href',
      'https://learningequality.org/donate/?source=kolibri-0.20.0%2Bgit.abc-banner-a',
    );
  });

  it.each([
    ['a', 3, /^Kolibri is free, open-source software/],
    ['b', 2, /^You’re using Kolibri/],
  ])('renders the copy of variant %s', (variant, count, opening) => {
    renderBanner(variant);
    const paragraphs = screen.getAllByTestId('donation-paragraph');
    expect(paragraphs).toHaveLength(count);
    expect(paragraphs[0]).toHaveTextContent(opening);
  });

  it('shows the QR code once a small window widens', async () => {
    const windowIsSmall = ref(true);
    useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall }));
    renderBanner('a');
    await global.flushPromises();
    expect(screen.queryByRole('img', { name: QR_ALT })).not.toBeInTheDocument();
    windowIsSmall.value = false;
    expect(await screen.findByRole('img', { name: QR_ALT })).toBeInTheDocument();
  });

  it.each([false, true])(
    'emits dismiss from a visibly labelled button when windowIsSmall is %s',
    async small => {
      useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall: ref(small) }));
      const { emitted } = renderBanner('a');
      const button = screen.getByRole('button', { name: DISMISS_ARIA_LABEL });
      expect(button).toHaveTextContent(DISMISS_LABEL);
      await fireEvent.click(button);
      expect(emitted().dismiss).toHaveLength(1);
    },
  );
});
