import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import router from 'kolibri/router';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line import-x/named
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';
import makeStore from '../../../../__tests__/utils/makeStore';
import LearnerHeader from '../LearnerHeader.vue';

jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/composables/useUser');
jest.mock('../../../../composables/fetchClassSyncStatus');
jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  __esModule: true,
  default: { fetchModel: jest.fn() },
}));
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE_QR'),
}));

const LEARNER_ID = 'learner-1';
const PICTURE_PASSWORD = '3.7.12';
const PICTURE_PASSWORD_SETTINGS = { icon_style: 'standard', show_icon_text: false };
const QR_LOGIN_TOKEN = 'a'.repeat(43);

const routes = [
  { path: '/class/:classId/learners/:learnerId', name: 'LEARNER_SUMMARY' },
  { path: '/class/:classId/learners', name: 'LEARNERS_ROOT' },
];

function renderComponent({
  picturePasswordSettings,
  picturePassword,
  qrLoginToken = null,
  enableQrLogin = false,
}) {
  const store = makeStore();
  store.state.classSummary.learnerMap = {
    [LEARNER_ID]: {
      id: LEARNER_ID,
      name: 'Test Learner',
      username: 'testlearner',
      picture_password: picturePassword,
    },
  };
  store.state.classSummary.picture_password_settings = picturePasswordSettings;

  useFacility.mockImplementation(() =>
    useFacilityMock({
      facilityConfig: ref({ enable_qr_login: enableQrLogin }),
    }),
  );

  // The token is no longer part of the bulk class-summary payload; LearnerHeader
  // fetches it on demand for the single learner being viewed.
  FacilityUserResource.fetchModel.mockResolvedValue({ qr_login_token: qrLoginToken });

  const router = new VueRouter({ routes });
  router.push({
    name: 'LEARNER_SUMMARY',
    params: { classId: 'class-1', learnerId: LEARNER_ID },
  });

  return render(LearnerHeader, {
    store,
    router,
    props: { learnerLessons: [] },
  });
}

describe('LearnerHeader', () => {
  beforeAll(() => {
    // initRoutes must be called so that router.getRoute can find the routes used in
    // the component tests
    router.initRoutes(routes);
  });
  describe('picture password row conditional rendering', () => {
    it('does not render when picture_password_settings is null', () => {
      renderComponent({ picturePasswordSettings: null, picturePassword: PICTURE_PASSWORD });
      expect(screen.queryByText(coreString('passwordLabel'))).not.toBeInTheDocument();
    });

    it('renders the password row with an empty placeholder when the learner has no picture_password', () => {
      const { container } = renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePassword: null,
      });
      expect(screen.getByText(coreString('passwordLabel'))).toBeInTheDocument();
      expect(container.querySelector('.picture-password-wrapper')).not.toBeInTheDocument();
    });

    it('renders the password row with icons when both picture_password_settings and picture_password are set', () => {
      const { container } = renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePassword: PICTURE_PASSWORD,
      });
      expect(screen.getByText(coreString('passwordLabel'))).toBeInTheDocument();
      expect(container.querySelector('.picture-password-wrapper')).toBeInTheDocument();
    });

    it('renders colorful icon names when icon_style is colorful', () => {
      const { container } = renderComponent({
        picturePasswordSettings: { icon_style: 'colorful', show_icon_text: false },
        picturePassword: PICTURE_PASSWORD,
      });
      const icons = [...container.querySelectorAll('[data-testid^="picture-password-icon-"]')];
      expect(icons.map(el => el.getAttribute('data-testid'))).toEqual([
        'picture-password-icon-moonColorful',
        'picture-password-icon-waterColorful',
        'picture-password-icon-birdColorful',
      ]);
    });

    it('renders standard icon names when icon_style is standard', () => {
      const { container } = renderComponent({
        picturePasswordSettings: { icon_style: 'standard', show_icon_text: false },
        picturePassword: PICTURE_PASSWORD,
      });
      const icons = [...container.querySelectorAll('[data-testid^="picture-password-icon-"]')];
      expect(icons.map(el => el.getAttribute('data-testid'))).toEqual([
        'picture-password-icon-moonStandard',
        'picture-password-icon-waterStandard',
        'picture-password-icon-birdStandard',
      ]);
    });
  });

  describe('QR code row conditional rendering', () => {
    it('does not render when enable_qr_login is false', () => {
      renderComponent({
        enableQrLogin: false,
        qrLoginToken: QR_LOGIN_TOKEN,
      });
      expect(screen.queryByText(qrLoginStrings.coachQrCode$())).not.toBeInTheDocument();
    });

    it('renders the row with an empty placeholder when the learner has no qr_login_token', async () => {
      const { container } = renderComponent({
        enableQrLogin: true,
        qrLoginToken: null,
      });
      expect(screen.getByText(qrLoginStrings.coachQrCode$())).toBeInTheDocument();
      // Let the on-demand token fetch resolve (to null) before asserting.
      await global.flushPromises();
      expect(container.querySelector('.user-qr-code')).not.toBeInTheDocument();
    });

    it('fetches and renders the QR code image when enable_qr_login and a token are set', async () => {
      const { container } = renderComponent({
        enableQrLogin: true,
        qrLoginToken: QR_LOGIN_TOKEN,
      });
      expect(screen.getByText(qrLoginStrings.coachQrCode$())).toBeInTheDocument();
      expect(FacilityUserResource.fetchModel).toHaveBeenCalledWith({
        id: LEARNER_ID,
        force: true,
      });
      // The token is fetched on demand, then UserQRCode generates the data URL
      // asynchronously via qrcode.toDataURL, so we wait for the <img> to appear.
      await screen.findByAltText(qrLoginStrings.myQRCode$());
      expect(container.querySelector('.user-qr-code')).toBeInTheDocument();
    });
  });
});
