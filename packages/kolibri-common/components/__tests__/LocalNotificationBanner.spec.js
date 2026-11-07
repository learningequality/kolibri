import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { ref } from 'vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import LocalNotificationBanner, {
  IMPACT_STORIES_KEY,
  DONATION_KEY,
} from '../LocalNotificationBanner.vue';
import { TITLE as DONATION_TITLE, DISMISS_ARIA_LABEL } from '../DonationBanner.vue';
import { impactStoryStrings } from '../../strings/impactStoryStrings';

const { title$, dismiss$ } = impactStoryStrings;

const IMPACT_ROW = {
  id: 1,
  key: IMPACT_STORIES_KEY,
  facility_name: 'Mountain View',
  learner_count: 42,
};

const DONATION_ROW = { id: 2, key: DONATION_KEY, variant: 'a' };

const mockI18n = { currentLanguage: 'en' };

jest.mock('kolibri/utils/i18n', () => {
  const actual = jest.requireActual('kolibri/utils/i18n');
  return {
    __esModule: true,
    ...actual,
    get currentLanguage() {
      return mockI18n.currentLanguage;
    },
  };
});

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE_QR'),
}));

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const LIST_URL = '/kolibri:core:localnotification_list';

function detailUrl(id) {
  return `/kolibri:core:localnotification_detail/${id}`;
}

function requestedUrls() {
  return client.mock.calls.map(([request]) => request.url);
}

describe('LocalNotificationBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.__reset();
    urls.__echoUrls();
    mockI18n.currentLanguage = 'en';
    useUser.mockImplementation(() => useUserMock({ isSuperuser: true }));
    useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall: ref(false) }));
  });

  it('renders nothing when there are no notifications', async () => {
    client.__setPayload([]);
    const { container } = render(LocalNotificationBanner);
    expect(requestedUrls()).toEqual([LIST_URL]);
    await global.flushPromises();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the impact-stories banner ahead of a donation notification', async () => {
    client.__setPayload([DONATION_ROW, IMPACT_ROW]);
    render(LocalNotificationBanner);
    expect(await screen.findByRole('heading', { name: title$() })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: DONATION_TITLE })).not.toBeInTheDocument();
  });

  it('dismisses by deleting the row and renders nothing, even with a donation row listed', async () => {
    client.__setPayload([IMPACT_ROW, DONATION_ROW]);
    const { container } = render(LocalNotificationBanner);
    await screen.findByRole('heading', { name: title$() });
    await fireEvent.click(screen.getByRole('button', { name: dismiss$() }));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(client).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: detailUrl(IMPACT_ROW.id), method: 'DELETE' }),
    );
    expect(requestedUrls()).toEqual([LIST_URL, detailUrl(IMPACT_ROW.id)]);
  });

  it('moves focus to the main region on dismissal', async () => {
    client.__setPayload([DONATION_ROW]);
    render({
      render: h => h('div', { attrs: { id: 'main' } }, [h(LocalNotificationBanner)]),
    });
    await screen.findByRole('heading', { name: DONATION_TITLE });
    await fireEvent.click(screen.getByRole('button', { name: DISMISS_ARIA_LABEL }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: DONATION_TITLE })).not.toBeInTheDocument(),
    );
    expect(document.getElementById('main')).toHaveFocus();
  });

  it('does not fetch when the user is not a superuser', () => {
    useUser.mockImplementation(() => useUserMock({ isSuperuser: false }));
    render(LocalNotificationBanner);
    expect(client).not.toHaveBeenCalled();
  });

  it('does not fetch when the language is not English', () => {
    mockI18n.currentLanguage = 'es-es';
    render(LocalNotificationBanner);
    expect(client).not.toHaveBeenCalled();
  });
});
