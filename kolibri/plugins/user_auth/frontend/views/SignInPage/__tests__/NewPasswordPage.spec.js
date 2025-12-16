import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import useUser from 'kolibri/composables/useUser';
import { coreStoreFactory } from 'kolibri/store';
import NewPasswordPage from '../NewPasswordPage.vue';

jest.mock('kolibri/composables/useUser');

const localVue = createLocalVue();
localVue.use(VueRouter);

describe('NewPasswordPage', () => {
  let wrapper;
  let router;
  const mockLogin = jest.fn();
  const mockSetUnspecifiedPassword = jest.fn();
  const mockFocus = jest.fn();

  beforeEach(() => {
    // Reset mocks
    mockLogin.mockReset();
    mockSetUnspecifiedPassword.mockReset();
    mockFocus.mockReset();

    // Create a fresh router instance for each test
    router = new VueRouter({
      routes: [
        { path: '/', name: 'SignInPage' },
        { path: '/back', name: 'Back' },
      ],
    });

    // Mock router methods to avoid actual navigation
    router.push = jest.fn();
    router.go = jest.fn();

    // Mock useUser composable
    useUser.mockImplementation(() => ({
      login: mockLogin,
    }));

    wrapper = mount(NewPasswordPage, {
      localVue,
      router,
      store: coreStoreFactory({
        actions: {
          kolibriSetUnspecifiedPassword: mockSetUnspecifiedPassword,
        },
      }),
      propsData: {
        username: 'testuser',
        facilityId: 'facility_1',
      },
      stubs: {
        // Stub the PasswordTextbox component to avoid DOM manipulation
        PasswordTextbox: true,
      },
    });

    // Properly spy on the goBack method after mounting
    jest.spyOn(wrapper.vm, 'goBack').mockImplementation(jest.fn());

    // Mock the $refs.createPassword element
    wrapper.vm.$refs.createPassword = { focus: mockFocus };
  });

  it('calls setUnspecifiedPassword and login when form is submitted with valid password', async () => {
    const password = 'validpassword';
    wrapper.vm.password = password;

    // Mock valid password
    wrapper.setData({ passwordIsValid: true });

    // Submit the form
    await wrapper.vm.updatePassword();

    expect(mockSetUnspecifiedPassword.mock.calls[0][1]).toEqual({
      username: 'testuser',
      facility: 'facility_1',
      password: 'validpassword',
    });

    expect(mockLogin).toHaveBeenCalledWith({
      username: 'testuser',
      facility: 'facility_1',
      password: 'validpassword',
    });
  });

  it('does not call setUnspecifiedPassword when password is invalid', async () => {
    // Mock invalid password
    wrapper.setData({ passwordIsValid: false });

    // Submit the form
    await wrapper.vm.updatePassword();

    // Should focus on the password field
    expect(mockFocus).toHaveBeenCalled();

    // Should not call the APIs
    expect(mockSetUnspecifiedPassword).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls goBack when setUnspecifiedPassword fails', async () => {
    mockSetUnspecifiedPassword.mockRejectedValue(new Error('Failed'));

    wrapper.setData({ passwordIsValid: true });
    await wrapper.vm.updatePassword();

    expect(wrapper.vm.goBack).toHaveBeenCalled();
  });

  it('calls goBack when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Failed'));

    wrapper.setData({ passwordIsValid: true });
    await wrapper.vm.updatePassword();

    expect(wrapper.vm.goBack).toHaveBeenCalled();
  });
});
