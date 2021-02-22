import urls from 'kolibri.urls';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import AuthMessage from '../../src/views/AuthMessage';
import { stubWindowLocation } from 'testUtils'; // eslint-disable-line

jest.mock('urls', () => ({}));

const localVue = createLocalVue();

localVue.use(Vuex);
localVue.use(VueRouter);

const router = new VueRouter();

function makeWrapper(options) {
  const store = new Vuex.Store({
    getters: {
      isUserLoggedIn() {
        return false;
      },
    },
  });
  return shallowMount(AuthMessage, { store, localVue, router, ...options });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    headerText: () => wrapper.find('.auth-message h1').text().trim(),
    detailsText: () => wrapper.find('.auth-message p').text().trim(),
  };
}

describe('auth message component', () => {
  stubWindowLocation(beforeAll, afterAll);

  beforeEach(() => {
    window.location.href = 'http://localhost:8000/#/test_url';
  });

  it('shows the correct details when there are no props', () => {
    const wrapper = makeWrapper({ propsData: {} });
    const { headerText, detailsText } = getElements(wrapper);
    expect(headerText()).toEqual('Did you forget to sign in?');
    expect(detailsText()).toEqual('You must be signed in to view this page');
  });

  it('shows the correct details when authorized role is "learner"', () => {
    const wrapper = makeWrapper({ propsData: { authorizedRole: 'learner' } });
    const { headerText, detailsText } = getElements(wrapper);
    expect(headerText()).toEqual('Did you forget to sign in?');
    expect(detailsText()).toEqual('You must be signed in as a learner to view this page');
  });

  it('shows the correct details when authorized role is "admin"', () => {
    const wrapper = makeWrapper({ propsData: { authorizedRole: 'admin' } });
    const { headerText, detailsText } = getElements(wrapper);
    expect(headerText()).toEqual('Did you forget to sign in?');
    expect(detailsText()).toEqual('You must be signed in as an admin to view this page');
  });

  it('shows correct text when both texts manually provided as prop', () => {
    const wrapper = makeWrapper({
      propsData: {
        header: 'Signed in as device owner',
        details: 'Cannot be used by device owner',
      },
    });
    const { headerText, detailsText } = getElements(wrapper);
    expect(headerText()).toEqual('Signed in as device owner');
    expect(detailsText()).toEqual('Cannot be used by device owner');
  });

  it('shows correct text when one text manually provided as prop', () => {
    const wrapper = makeWrapper({
      propsData: {
        details: 'Must be device owner to manage resources',
      },
    });
    const { headerText, detailsText } = getElements(wrapper);
    expect(headerText()).toEqual('Did you forget to sign in?');
    expect(detailsText()).toEqual('Must be device owner to manage resources');
  });

  describe('tests for sign-in page link when user plugin exists', () => {
    beforeAll(() => {
      const userUrl = jest.fn();
      urls['kolibri:kolibri.plugins.user:user'] = userUrl;
      userUrl.mockReturnValue('http://localhost:8000/en/user/');
    });

    afterAll(() => {
      delete urls['kolibri:kolibri.plugins.user:user'];
    });

    it('shows correct link text if there is a user plugin', () => {
      const wrapper = makeWrapper();
      const link = wrapper.find('kexternallink-stub');
      expect(link.attributes()).toMatchObject({
        href:
          'http://localhost:8000/en/user/#/signin?next=http%3A%2F%2Flocalhost%3A8000%2F%23%2Ftest_url',
        text: 'Sign in to Kolibri',
      });
    });

    it('if the next param is in URL, it is what is used in the sign-in page link', () => {
      window.location.href = 'http://localhost:8000/#/some_other_url';
      const wrapper = makeWrapper();
      const link = wrapper.find('kexternallink-stub');
      expect(link.attributes()).toMatchObject({
        href:
          'http://localhost:8000/en/user/#/signin?next=http%3A%2F%2Flocalhost%3A8000%2F%23%2Fsome_other_url',
        text: 'Sign in to Kolibri',
      });
    });
  });

  it('shows correct link text if there is not a user plugin', () => {
    const wrapper = makeWrapper();
    const link = wrapper.find('kexternallink-stub');
    expect(link.attributes()).toMatchObject({
      href: '/',
      text: 'Go to home page',
    });
  });

  it('does not show a link if the user is logged in', () => {
    const store = new Vuex.Store({
      getters: {
        isUserLoggedIn() {
          return true;
        },
      },
    });
    const wrapper = makeWrapper({ store });
    expect(wrapper.find('kexternallink-stub').exists()).toBe(false);
  });
});
