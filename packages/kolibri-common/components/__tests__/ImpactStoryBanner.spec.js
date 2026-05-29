import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { ref } from 'vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import LocalNotificationResource from 'kolibri-common/apiResources/LocalNotificationResource';
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

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri-common/apiResources/LocalNotificationResource', () => ({
  __esModule: true,
  default: { fetchCollection: jest.fn(), deleteModel: jest.fn() },
}));

describe('ImpactStoryBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock({ isSuperuser: true }));
    useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall: ref(false) }));
  });

  it('renders nothing while no notification has been fetched', async () => {
    LocalNotificationResource.fetchCollection.mockResolvedValue([]);
    render(ImpactStoryBanner);
    await waitFor(() => expect(LocalNotificationResource.fetchCollection).toHaveBeenCalled());
    expect(screen.queryByText(title$())).not.toBeInTheDocument();
  });

  it('renders title, dismiss control, QR, WhatsApp number, and story-form link when a notification arrives', async () => {
    LocalNotificationResource.fetchCollection.mockResolvedValue([FAKE_ROW]);
    render(ImpactStoryBanner);

    await waitFor(() => expect(screen.getByText(title$())).toBeInTheDocument());
    expect(screen.getByRole('button', { name: dismiss$() })).toBeInTheDocument();

    const qr = await waitFor(() => screen.getByAltText(qrAlt$()));
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

  it('dismisses by deleting the row and hides itself', async () => {
    LocalNotificationResource.fetchCollection.mockResolvedValue([FAKE_ROW]);
    LocalNotificationResource.deleteModel.mockResolvedValue();
    render(ImpactStoryBanner);
    await waitFor(() => expect(screen.getByText(title$())).toBeInTheDocument());
    await fireEvent.click(screen.getByRole('button', { name: dismiss$() }));
    await waitFor(() =>
      expect(LocalNotificationResource.deleteModel).toHaveBeenCalledWith({ id: FAKE_ROW.id }),
    );
    await waitFor(() => expect(screen.queryByText(title$())).not.toBeInTheDocument());
  });

  it('does not fetch when the user is not a superuser', async () => {
    useUser.mockImplementation(() => useUserMock({ isSuperuser: false }));
    render(ImpactStoryBanner);
    await Promise.resolve();
    expect(LocalNotificationResource.fetchCollection).not.toHaveBeenCalled();
  });
});
