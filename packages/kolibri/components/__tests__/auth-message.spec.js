import urls from 'kolibri/urls';
import VueRouter from 'vue-router';
import { render, screen } from '@testing-library/vue';
import { stubWindowLocation } from 'testUtils'; // eslint-disable-line
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import { createTranslator } from 'kolibri/utils/i18n';
import AuthMessage from '../AuthMessage';

jest.mock('kolibri/urls', () => ({
  'kolibri:core:redirect_user': () => '/',
}));
jest.mock('kolibri/composables/useUser');

const { forgetToSignIn$, registeredUser$, admin$, signInToKolibriAction$, goBackToHomeAction$ } =
  createTranslator(AuthMessage.name, AuthMessage.$trs);

function renderComponent(props = {}) {
  return render(AuthMessage, { props, routes: new VueRouter() });
}

describe('AuthMessage', () => {
  stubWindowLocation(beforeAll, afterAll);

  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock());
  });

  it('prompts the user to sign in by default', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: forgetToSignIn$() })).toBeInTheDocument();
    expect(screen.getByText(registeredUser$())).toBeInTheDocument();
  });

  it('explains which role is required to view the page', () => {
    renderComponent({ authorizedRole: 'admin' });
    expect(screen.getByText(admin$())).toBeInTheDocument();
  });

  it('shows a custom header and details when provided', () => {
    const header = 'Signed in as device owner';
    const details = 'Cannot be used by device owner';
    renderComponent({ header, details });
    expect(screen.getByRole('heading', { name: header })).toBeInTheDocument();
    expect(screen.getByText(details)).toBeInTheDocument();
  });

  it('keeps the default header when only details are provided', () => {
    const details = 'Must be device owner to manage resources';
    renderComponent({ details });
    expect(screen.getByRole('heading', { name: forgetToSignIn$() })).toBeInTheDocument();
    expect(screen.getByText(details)).toBeInTheDocument();
  });

  describe('when the user auth plugin exists', () => {
    beforeAll(() => {
      urls['kolibri:kolibri.plugins.user_auth:user_auth'] = jest
        .fn()
        .mockReturnValue('http://localhost:8000/en/auth/');
    });

    afterAll(() => {
      delete urls['kolibri:kolibri.plugins.user_auth:user_auth'];
    });

    it('links to the sign in page, returning to the current page afterwards', () => {
      window.location.href = 'http://kolibri.time/#/';
      renderComponent();
      expect(screen.getByRole('link', { name: signInToKolibriAction$() })).toHaveAttribute(
        'href',
        'http://localhost:8000/en/auth/#/signin?next=http%3A%2F%2Fkolibri.time%2F%23%2F',
      );
    });
  });

  it('links to the home page when there is no user auth plugin', () => {
    renderComponent();
    expect(screen.getByRole('link', { name: goBackToHomeAction$() })).toHaveAttribute('href', '/');
  });

  it('does not offer to sign in when the user is already signed in', () => {
    useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
    renderComponent();
    expect(screen.queryByRole('link', { name: signInToKolibriAction$() })).not.toBeInTheDocument();
  });
});
