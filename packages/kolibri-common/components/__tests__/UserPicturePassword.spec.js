import { render } from '@testing-library/vue';
import { ref } from 'vue';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import UserPicturePassword from '../UserPicturePassword.vue';

jest.mock('kolibri-common/composables/useFacility');

describe('UserPicturePassword', () => {
  it('renders expected captions for picturePassword 3.7.12', () => {
    useFacility.mockImplementation(() =>
      useFacilityMock({
        facilityConfig: ref({
          picture_password_settings: {
            icon_style: PicturePasswordIconStyle.COLORFUL,
          },
        }),
      }),
    );

    const { container } = render(UserPicturePassword, {
      props: {
        picturePassword: '3.7.12',
      },
    });

    const captions = Array.from(container.querySelectorAll('figcaption')).map(node =>
      node.textContent.trim(),
    );

    expect(captions).toEqual(['moon', 'water', 'bird']);
  });
});
