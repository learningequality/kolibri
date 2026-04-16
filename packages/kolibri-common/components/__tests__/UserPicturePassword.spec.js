import { render, screen } from '@testing-library/vue';
import { ref } from 'vue';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import UserPicturePassword from '../UserPicturePassword.vue';

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

  it('renders expected captions for picturePassword 3.7.12', () => {
    const { container } = render(UserPicturePassword, {
      props: { picturePassword: '3.7.12' },
    });

    const captions = Array.from(container.querySelectorAll('figcaption')).map(node =>
      node.textContent.trim(),
    );

    expect(captions).toEqual(['moon', 'water', 'bird']);
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

  describe('showCounts prop', () => {
    it('does not render count numbers by default', () => {
      render(UserPicturePassword, {
        props: { picturePassword: '3.7.12' },
      });

      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
    });

    it('renders count numbers when showCounts is true', () => {
      render(UserPicturePassword, {
        props: { picturePassword: '3.7.12', showCounts: true },
      });

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
