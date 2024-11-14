import { mount } from '@vue/test-utils';
import { Store } from 'vuex';
import VueRouter from 'vue-router';
import NewPasswordPage from '../NewPasswordPage';

const loginSpy = jest.fn().mockResolvedValue();
const updatePwSpy = jest.fn().mockResolvedValue();

const store = new Store({
  actions: {
    kolibriSetUnspecifiedPassword: updatePwSpy,
    kolibriLogin: loginSpy,
  },
});

const router = new VueRouter({
  routes: [{ name: 'SignInPage', path: '/sign-in' }],
});

function makeWrapper() {
  const signInSpy = jest.spyOn(NewPasswordPage.methods, 'signIn');
  const wrapper = mount(NewPasswordPage, {
    propsData: {
      username: 'a',
      facilityId: 'f',
    },
    store,
    router,
    stubs: {
      AuthBase: {
        template: '<div><slot></slot></div>',
      },
    },
  });
  return { wrapper, signInSpy };
}

describe('NewPasswordPage', () => {
  afterEach(() => {
    loginSpy.mockReset();
    updatePwSpy.mockReset();
  });

  it('if password is not valid, clicking "continue" does nothing', async () => {
    const { wrapper } = makeWrapper();
    const button = wrapper.find('[data-test="submit"]');
    button.trigger('click');
    await global.flushPromises();
    expect(updatePwSpy).not.toHaveBeenCalled();
  });

  it('if password is valid, clicking "continue" updates pw and signs user in', async () => {
    const { wrapper } = makeWrapper();
    wrapper.setData({
      password: 'pass',
      passwordIsValid: true,
    });
    const button = wrapper.find('[data-test="submit"]');
    button.trigger('click');
    await global.flushPromises();
    expect(updatePwSpy.mock.calls[0][1]).toMatchObject({
      username: 'a',
      password: 'pass',
      facility: 'f',
    });
    expect(loginSpy.mock.calls[0][1]).toMatchObject({
      username: 'a',
      password: 'pass',
      facility: 'f',
    });
  });

  it('clicking the "go back" navigates user to the Sign-In page', () => {
    const { wrapper } = makeWrapper();
    const button = wrapper.find('[data-test="goback"]');
    button.trigger('click');
    expect(wrapper.vm.$route.name).toEqual('SignInPage');
  });
});
