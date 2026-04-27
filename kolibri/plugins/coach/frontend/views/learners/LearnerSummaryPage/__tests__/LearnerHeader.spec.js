import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import router from 'kolibri/router';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import makeStore from '../../../../__tests__/utils/makeStore';
import LearnerHeader from '../LearnerHeader.vue';

jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/composables/useUser');
jest.mock('../../../../composables/fetchClassSyncStatus');

const LEARNER_ID = 'learner-1';
const PICTURE_PASSWORD = '3.7.12';
const PICTURE_PASSWORD_SETTINGS = { icon_style: 'standard', show_icon_text: false };

const routes = [
  { path: '/class/:classId/learners/:learnerId', name: 'LEARNER_SUMMARY' },
  { path: '/class/:classId/learners', name: 'LEARNERS_ROOT' },
];

function renderComponent({ picturePasswordSettings, picturePassword }) {
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
});
