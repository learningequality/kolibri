import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import client from 'kolibri.client';
import DeviceSettingsPage from '../index.vue';

jest.mock('kolibri.client');
jest.mock('kolibri.urls');

const localVue = createLocalVue();
localVue.use(Vuex);
const store = new Vuex.Store({
  state: {},
  getters: {
    isAppContext: () => false,
  },
  actions: {
    createSnackbar() {},
  },
});

async function makeWrapper() {
  const wrapper = mount(DeviceSettingsPage, {
    wrapper,
    store,
  });
  // Need to wait for beforeMount to finish
  await global.flushPromises();
  return { wrapper };
}

function getButtons(wrapper) {
  const radioButtons = wrapper.findAllComponents({ name: 'KRadioButton' });
  const saveButton = wrapper.findComponent({ name: 'KButton' });
  return {
    learnPage: radioButtons.at(0),
    signInPage: radioButtons.at(1),
    allowGuestAccess: radioButtons.at(2),
    disallowGuestAccess: radioButtons.at(3),
    lockedContent: radioButtons.at(4),
    saveButton,
  };
}

describe('DeviceSettingsPage', () => {
  afterEach(() => {
    client.mockReset();
  });

  it('loads the data from getDeviceSettings', async () => {
    client.mockResolvedValue({
      data: {
        language_id: 'en',
        landing_page: 'sign-in',
        allow_guest_access: false,
        allow_learner_unassigned_resource_access: false,
        allow_peer_unlisted_channel_import: true,
        allow_other_browsers_to_connect: false,
      },
    });
    const { wrapper } = await makeWrapper();
    const data = wrapper.vm.$data;
    expect(data.language).toMatchObject({ value: 'en', label: 'English' });
    expect(data).toMatchObject({
      landingPage: 'sign-in',
      allowPeerUnlistedChannelImport: true,
      allowOtherBrowsersToConnect: false,
    });
  });
  async function clickRadioButton(rb) {
    // HACK(kds-test) You need to call `vm.update(true)` method on KCheckbox to simulate a click
    rb.vm.update(true);
    await global.flushPromises();
  }

  function assertIsDisabled(button, expected) {
    return expect(button.props().disabled).toBe(expected);
  }

  function assertIsSelected(button, expected) {
    // HACK(kds-test) The only way to tell it's checked in the DOM is to look for "svg.checked";
    expect(button.find('svg.checked').exists()).toBe(expected);
  }

  function setMockedData(allowGuestAccess, allowAllAccess) {
    client.mockResolvedValue({
      data: {
        landing_page: 'sign-in',
        allow_guest_access: allowGuestAccess,
        allow_learner_unassigned_resource_access: allowAllAccess,
      },
    });
  }

  describe('landing page section', () => {
    // These should be the inverse of the "submitting settings" tests below
    it('hydrates with the correct state when guest access is allowed', async () => {
      setMockedData(true, true);
      const { wrapper } = await makeWrapper();
      // The "Allow users to explore..." radio button should be checked
      const { allowGuestAccess } = getButtons(wrapper);
      assertIsSelected(allowGuestAccess, true);
    });

    it('hydrates with the correct state when guest access is disallowed', async () => {
      setMockedData(false, true);
      const { wrapper } = await makeWrapper();
      // The "Learners must sign in..." radio button should checked
      const { disallowGuestAccess } = getButtons(wrapper);
      assertIsSelected(disallowGuestAccess, true);
    });

    it('hydrates with the correct state when content is locked', async () => {
      setMockedData(false, false);
      const { wrapper } = await makeWrapper();
      // The "Signed in learners only see resources assigned to them" button should be checked
      const { lockedContent } = getButtons(wrapper);
      assertIsSelected(lockedContent, true);
    });

    // The fourth possibility with guest access but no channels tab should be impossible

    it('if Learn page is the landing page, sign-in page options are disabled', async () => {
      client.mockResolvedValue({
        data: {
          landing_page: 'learn',
          // The guest access button should not be checked
          allow_guest_access: true,
        },
      });
      const { wrapper } = await makeWrapper();
      const { learnPage, allowGuestAccess, disallowGuestAccess, lockedContent } = getButtons(
        wrapper
      );
      // Learn page button is enabled and checked
      assertIsDisabled(learnPage, false);
      assertIsSelected(learnPage, true);

      // Every radio button under the Sign-In page option should be disabled
      [allowGuestAccess, disallowGuestAccess, lockedContent].forEach(button => {
        assertIsDisabled(button, true);
        assertIsSelected(button, false);
      });
    });

    it('if switching  from Learn to Sign-In, "Allow users to explore..." is selected', async () => {
      client.mockResolvedValue({ data: { landing_page: 'learn' } });
      const { wrapper } = await makeWrapper();
      const { signInPage, allowGuestAccess } = getButtons(wrapper);
      await clickRadioButton(signInPage);
      assertIsSelected(allowGuestAccess, true);
      assertIsDisabled(allowGuestAccess, false);
    });
  });

  describe('submitting changes', () => {
    beforeEach(() => {
      client.mockResolvedValue({
        data: {
          language_id: 'en',
          landing_page: 'sign-in',
          allow_guest_access: false,
          allow_learner_unassigned_resource_access: true,
          allow_peer_unlisted_channel_import: true,
          allow_other_browsers_to_connect: false,
        },
      });
    });

    it('landing page is Learn page', async () => {
      const { wrapper } = await makeWrapper();
      const saveSpy = jest.spyOn(wrapper.vm, 'saveDeviceSettings').mockResolvedValue();
      const { learnPage, saveButton } = getButtons(wrapper);
      await clickRadioButton(learnPage);
      saveButton.trigger('click');
      await global.flushPromises();
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          landingPage: 'learn',
          allowGuestAccess: true,
          allowLearnerUnassignedResourceAccess: true,
        })
      );
    });

    // NOTE: See screenshot in #7247 for how radio button selection should map to settings
    it('"Allow users to explore resources without signing in" is selected', async () => {
      const { wrapper } = await makeWrapper();
      const saveSpy = jest.spyOn(wrapper.vm, 'saveDeviceSettings').mockResolvedValue();
      const { disallowGuestAccess, allowGuestAccess, saveButton } = getButtons(wrapper);
      // Click "disallow guest access first" to temporarily change settings from initial state
      await clickRadioButton(disallowGuestAccess);
      await clickRadioButton(allowGuestAccess);
      saveButton.trigger('click');
      await global.flushPromises();
      // Implications: Can see "explore without account" AND can see "channels" tab
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          landingPage: 'sign-in',
          allowGuestAccess: true,
          allowLearnerUnassignedResourceAccess: true,
        })
      );
    });

    it('"Learners must sign in to explore resources" is selected', async () => {
      const { wrapper } = await makeWrapper();
      const saveSpy = jest.spyOn(wrapper.vm, 'saveDeviceSettings').mockResolvedValue();
      const { disallowGuestAccess, saveButton } = getButtons(wrapper);
      await clickRadioButton(disallowGuestAccess);
      saveButton.trigger('click');
      await global.flushPromises();
      // Implications: Cannot see "explore without account" AND can see "channels" tab
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          landingPage: 'sign-in',
          allowGuestAccess: false,
          allowLearnerUnassignedResourceAccess: true,
        })
      );
    });

    it('"Signed in learners only see resources assigned to them in classes" is selected', async () => {
      const { wrapper } = await makeWrapper();
      const saveSpy = jest.spyOn(wrapper.vm, 'saveDeviceSettings').mockResolvedValue();
      const { lockedContent, saveButton } = getButtons(wrapper);
      await clickRadioButton(lockedContent);
      saveButton.trigger('click');
      await global.flushPromises();
      console.log(wrapper.vm.signInPageOption);
      // Implications: Cannot see "explore without account" AND cannot see "channels" tab
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          landingPage: 'sign-in',
          allowGuestAccess: false,
          allowLearnerUnassignedResourceAccess: false,
        })
      );
    });
  });
});
