import { render, screen } from '@testing-library/vue';
import { ref } from 'vue';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import UserPicturePassword from '../UserPicturePassword.vue';

const { moon$, water$, bird$, picturePasswordForLearner$, picturePasswordList$ } =
  picturePasswordStrings;

const LEARNER_NAME = 'Alice';
const PICTURE_PASSWORD = '3.7.12';

jest.mock('kolibri-common/composables/useFacility');

function mockFacilityConfig(iconStyle, showIconText = false) {
  useFacility.mockImplementation(() =>
    useFacilityMock({
      facilityConfig: ref({
        picture_password_settings: iconStyle
          ? { icon_style: iconStyle, show_icon_text: showIconText }
          : null,
      }),
    }),
  );
}

const COLORFUL_FACILITY_CONFIG = ref({
  picture_password_settings: {
    icon_style: PicturePasswordIconStyle.COLORFUL,
  },
});

function setupFacilityMock() {
  useFacility.mockImplementation(() =>
    useFacilityMock({ facilityConfig: COLORFUL_FACILITY_CONFIG }),
  );
}

describe('UserPicturePassword', () => {
  beforeEach(() => {
    setupFacilityMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('aria-label', () => {
    it('uses the list sentence when no learnerName is provided', () => {
      render(UserPicturePassword, {
        props: { picturePassword: PICTURE_PASSWORD },
      });

      const labels = [moon$(), water$(), bird$()].join(', ');
      expect(screen.getByText(picturePasswordList$({ count: 3, labels }))).toBeInTheDocument();
    });

    it('uses the learner sentence when learnerName is provided', () => {
      render(UserPicturePassword, {
        props: { picturePassword: PICTURE_PASSWORD, learnerName: LEARNER_NAME },
      });

      const labels = [moon$(), water$(), bird$()].join(', ');
      expect(
        screen.getByText(
          picturePasswordForLearner$({ learnerName: LEARNER_NAME, count: 3, labels }),
        ),
      ).toBeInTheDocument();
    });
  });

  it('renders expected captions for picturePassword 3.7.12', () => {
    const { container } = render(UserPicturePassword, {
      props: { picturePassword: PICTURE_PASSWORD },
    });

    const captions = Array.from(container.querySelectorAll('figcaption')).map(node =>
      node.textContent.trim(),
    );

    expect(captions).toEqual([moon$(), water$(), bird$()]);
  });

  it('hides figcaption labels when showIconText is false via facilityConfig', () => {
    mockFacilityConfig(PicturePasswordIconStyle.STANDARD, false);

    const { container } = render(UserPicturePassword, {
      props: { picturePassword: '3.7.12' },
    });

    const captions = [...container.querySelectorAll('figcaption')];
    expect(captions.length).toBeGreaterThan(0);
    expect(captions.every(el => el.classList.contains('visuallyhidden'))).toBe(true);
  });

  it('shows figcaption labels when showIconText is true via facilityConfig', () => {
    mockFacilityConfig(PicturePasswordIconStyle.STANDARD, true);

    const { container } = render(UserPicturePassword, {
      props: { picturePassword: '3.7.12' },
    });

    const captions = [...container.querySelectorAll('figcaption')];
    expect(captions.length).toBeGreaterThan(0);
    expect(captions.every(el => !el.classList.contains('visuallyhidden'))).toBe(true);
  });

  it('showIconText prop overrides facilityConfig show_icon_text', () => {
    mockFacilityConfig(PicturePasswordIconStyle.STANDARD, false);

    const { container } = render(UserPicturePassword, {
      props: { picturePassword: '3.7.12', showIconText: true },
    });

    const captions = [...container.querySelectorAll('figcaption')];
    expect(captions.length).toBeGreaterThan(0);
    expect(captions.every(el => !el.classList.contains('visuallyhidden'))).toBe(true);
  });

  it('iconStyle prop overrides facility config icon_style', () => {
    mockFacilityConfig(PicturePasswordIconStyle.COLORFUL);

    const { container } = render(UserPicturePassword, {
      props: { picturePassword: '3.7.12', iconStyle: PicturePasswordIconStyle.STANDARD },
    });

    const icons = [...container.querySelectorAll('[data-testid^="picture-password-icon-"]')];
    expect(icons.map(el => el.getAttribute('data-testid'))).toEqual([
      'picture-password-icon-moonStandard',
      'picture-password-icon-waterStandard',
      'picture-password-icon-birdStandard',
    ]);
  });

  describe('showSequenceNumbers prop', () => {
    it('does not add show-sequence-numbers class by default', () => {
      const { container } = render(UserPicturePassword, {
        props: { picturePassword: PICTURE_PASSWORD },
      });

      expect(container.querySelector('.show-sequence-numbers')).not.toBeInTheDocument();
    });

    it('adds show-sequence-numbers class when showSequenceNumbers is true', () => {
      const { container } = render(UserPicturePassword, {
        props: { picturePassword: PICTURE_PASSWORD, showSequenceNumbers: true },
      });

      expect(container.querySelector('.show-sequence-numbers')).toBeInTheDocument();
    });
  });
});
