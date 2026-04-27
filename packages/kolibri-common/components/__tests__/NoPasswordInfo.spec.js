import { render, screen } from '@testing-library/vue';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import NoPasswordInfo from '../NoPasswordInfo.vue';

describe('NoPasswordInfo', () => {
  it('renders the "no picture password" title', () => {
    render(NoPasswordInfo);
    expect(
      screen.getByText(picturePasswordStrings.noPicturePasswordDescription$()),
    ).toBeInTheDocument();
  });

  it('renders the "sign in with text password" subtitle', () => {
    render(NoPasswordInfo);
    expect(
      screen.getByText(picturePasswordStrings.noPasswordSignInDescription$()),
    ).toBeInTheDocument();
  });
});
