import { render, screen, fireEvent } from '@testing-library/vue';
import { ref } from 'vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import ImpactStoryBanner, {
  WHATSAPP_PATH,
  WHATSAPP_NUMBER_DISPLAY,
  STORY_FORM_DISPLAY,
  STORY_FORM_HREF,
} from '../ImpactStoryBanner.vue';
import { impactStoryStrings } from '../../strings/impactStoryStrings';

const { title$, dismiss$, qrAlt$, whatsappLine$, storyFormLine$ } = impactStoryStrings;

const FAKE_ROW = {
  id: 1,
  key: 'impact-stories',
  facility_name: 'Mountain View',
  learner_count: 42,
};

// Stub the qrcode dependency so jsdom doesn't try to use canvas.
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE_QR'),
}));

jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');

describe('ImpactStoryBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall: ref(false) }));
  });

  it('renders title, dismiss control, QR, WhatsApp number, and story-form link', async () => {
    render(ImpactStoryBanner, { props: { notification: FAKE_ROW } });

    expect(screen.getByRole('heading', { name: title$() })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: dismiss$() })).toBeInTheDocument();

    const qr = await screen.findByAltText(qrAlt$());
    expect(qr).toHaveAttribute('src', 'data:image/png;base64,FAKE_QR');

    const whatsappLink = screen.getByRole('link', {
      name: whatsappLine$({ phoneNumber: WHATSAPP_NUMBER_DISPLAY }),
    });
    expect(whatsappLink).toHaveAttribute(
      'href',
      expect.stringMatching(new RegExp(`^https://wa\\.me/${WHATSAPP_PATH}\\?text=`)),
    );
    const href = whatsappLink.getAttribute('href');
    expect(decodeURIComponent(href)).toContain('Mountain View');
    expect(decodeURIComponent(href)).toContain('42');
    expect(decodeURIComponent(href)).toContain('learners');

    const formLink = screen.getByRole('link', {
      name: storyFormLine$({ url: STORY_FORM_DISPLAY }),
    });
    expect(formLink).toHaveAttribute('href', STORY_FORM_HREF);
  });

  it('shows the QR code once a small window widens', async () => {
    const windowIsSmall = ref(true);
    useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall }));
    render(ImpactStoryBanner, { props: { notification: FAKE_ROW } });
    await global.flushPromises();
    expect(screen.queryByAltText(qrAlt$())).not.toBeInTheDocument();
    windowIsSmall.value = false;
    expect(await screen.findByAltText(qrAlt$())).toBeInTheDocument();
  });

  it('emits dismiss when the dismiss control is clicked', async () => {
    const { emitted } = render(ImpactStoryBanner, { props: { notification: FAKE_ROW } });
    await fireEvent.click(screen.getByRole('button', { name: dismiss$() }));
    expect(emitted().dismiss).toHaveLength(1);
  });
});
