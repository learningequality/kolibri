import VueRouter from 'vue-router';
import { mount } from '@vue/test-utils';
import ChannelListItem from '../../src/views/ManageContentPage/ChannelListItem';
import { defaultChannel } from '../utils/data';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

const fakeImage = 'data:image/png;base64,abcd1234';

function makeWrapper(options = {}) {
  const { props = {}, store } = options;
  const defaultProps = {
    channel: {
      ...defaultChannel,
      thumbnail: fakeImage,
    },
    mode: 'MANAGE',
    onDevice: false,
  };
  return mount(ChannelListItem, {
    propsData: { ...defaultProps, ...props },
    store: store || makeAvailableChannelsPageStore(),
    router: new VueRouter({
      routes: [
        {
          name: 'SELECT_CONTENT',
          path: '/content/channel/:channel_id',
        },
      ],
    }),
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    resourcesSizeText: () => wrapper.find('.spec-ref-resources-size').text().trim(),
    resourcesSize: () => wrapper.find('.spec-ref-resources-size'),
    onDevice: () => wrapper.find('.spec-ref-on-device'),
    selectButton: () => wrapper.find({ name: 'KRouterLink' }),
    title: () => wrapper.find('.title').text().trim(),
    version: () => wrapper.find('.version').text().trim(),
    description: () => wrapper.find('.spec-ref-description').text().trim(),
    thumbnail: () => wrapper.find('[data-test="thumbnail"]'),
    addTaskMutation: (task) => wrapper.vm.$store.commit('manageContent/SET_TASK_LIST', [task]),
    dropdownMenu: () => wrapper.find({ name: 'KDropdownMenu' }),
  };
}

describe('channelListItem', () => {
  let importWrapper;
  let exportWrapper;
  let manageWrapper;

  beforeEach(() => {
    exportWrapper = makeWrapper({ props: { mode: 'EXPORT' } });
    importWrapper = makeWrapper({ props: { mode: 'IMPORT' } });
    manageWrapper = makeWrapper({ props: { mode: 'MANAGE' } });
  });

  describe('in any mode', () => {
    function testAll(test) {
      test(importWrapper);
      test(exportWrapper);
      test(manageWrapper);
    }

    it('shows the channel title, version, and description', () => {
      function test(wrapper) {
        const { title, version, description } = getElements(wrapper);
        expect(title()).toEqual('Channel Title');
        expect(version()).toEqual('Version 10');
        expect(description()).toEqual('An awesome channel');
      }
      testAll(test);
    });

    it('shows the thumbnail using encoded string', () => {
      function test(wrapper) {
        wrapper.setProps({ channel: { ...defaultChannel, thumbnail: fakeImage } });
        const { thumbnail } = getElements(wrapper);
        const thumb = thumbnail();
        expect(thumb.find('img').attributes().src).toEqual(fakeImage);
        expect(thumb.contains('svg')).toEqual(false);
      }
      testAll(test);
    });

    it('defaults to a material design icon if there is no thumbnail', () => {
      exportWrapper = makeWrapper({
        props: { mode: 'EXPORT', channel: { ...defaultChannel, thumbnail: '' } },
      });
      importWrapper = makeWrapper({
        props: { mode: 'IMPORT', channel: { ...defaultChannel, thumbnail: '' } },
      });
      manageWrapper = makeWrapper({
        props: { mode: 'MANAGE', channel: { ...defaultChannel, thumbnail: '' } },
      });
      function test(wrapper) {
        const { thumbnail } = getElements(wrapper);
        const thumb = thumbnail();
        // We are not using the mat-svg webpack loader, so just check for the
        // mat-svg tag here untransformed.
        expect(thumb.contains('mat-svg')).toEqual(true);
        expect(thumb.contains('img')).toEqual(false);
      }
      testAll(test);
    });
  });

  it('if the channel is installed, the version number is of the installed channel', () => {
    // NOTE: need to call $forceUpdate after using .setProps()
    // see https://github.com/vuejs/vue-test-utils/issues/480
    importWrapper.setProps({
      onDevice: true,
      channel: {
        id: 'awesome_channel',
        version: 10,
      },
    });
    importWrapper.vm.$forceUpdate();
    const { version } = getElements(importWrapper);
    expect(version()).toEqual('Version 10');
  });

  it('if the channel is not installed, the version number is of the remote channel', () => {
    importWrapper.setProps({
      onDevice: false,
      channel: {
        id: 'not_installed',
        version: 20,
      },
    });
    importWrapper.vm.$forceUpdate();
    const { version } = getElements(importWrapper);
    return importWrapper.vm.$nextTick().then(() => {
      expect(version()).toEqual('Version 20');
    });
  });

  it('in MANAGE/EXPORT shows the on-device file sizes of Resources', () => {
    // ...and does not show the "On Device" indicator
    function test(wrapper) {
      const { resourcesSizeText, onDevice } = getElements(wrapper);
      expect(resourcesSizeText()).toEqual('95 MB');
      expect(onDevice().exists()).toEqual(false);
    }
    test(manageWrapper);
    test(exportWrapper);
  });

  it('in MANAGE mode only, clicking "delete" triggers a "clickdelete" event', () => {
    const wrapper = manageWrapper;
    const { dropdownMenu, selectButton } = getElements(wrapper);
    // Select button is not shown
    expect(selectButton().exists()).toEqual(false);
    return wrapper.vm.$nextTick().then(() => {
      // HACK trigger an event from dropdown menu options, since the actual button is hard to target
      dropdownMenu().vm.$emit('select', { value: 'DELETE_CHANNEL' });
      expect(wrapper.emitted().clickdelete.length).toEqual(1);
    });
  });

  it('in MANAGE mode only, delete button is disabled when tasks in queue', () => {
    const wrapper = manageWrapper;
    const { dropdownMenu, addTaskMutation } = getElements(wrapper);
    addTaskMutation({ id: 'task_1' });
    return wrapper.vm.$nextTick().then(() => {
      // prettier-ignore
      expect(dropdownMenu().props().disabled).toEqual(true)
    });
  });

  it('in IMPORT/EXPORT mode, "select" button is disabled when tasks in queue', () => {
    function test(wrapper) {
      const { selectButton, addTaskMutation } = getElements(wrapper);
      addTaskMutation({ id: 'task_1' });
      return wrapper.vm.$nextTick().then(() => {
        // prettier-ignore
        expect(selectButton().attributes().disabled).toEqual('disabled');
      });
    }
    return Promise.all([test(importWrapper), test(exportWrapper)]);
  });

  it('in IMPORT mode only, shows an "on device" indicator if channel is installed', () => {
    function posTest(wrapper) {
      wrapper.setProps({ onDevice: true });
      const { onDevice, resourcesSize } = getElements(wrapper);
      return wrapper.vm.$nextTick().then(() => {
        expect(onDevice().exists()).toEqual(true);
        expect(resourcesSize().exists()).toEqual(false);
      });
    }
    function negTest(wrapper) {
      wrapper.setProps({ onDevice: true });
      const { onDevice } = getElements(wrapper);
      expect(onDevice().exists()).toEqual(false);
    }
    return posTest(importWrapper).then(() => {
      negTest(exportWrapper);
      negTest(manageWrapper);
    });
  });

  it('in IMPORT mode only, does not show the "on device" indicator if channel is not installed', () => {
    const wrapper = importWrapper;
    wrapper.setProps({ onDevice: false });
    const { onDevice, resourcesSize } = getElements(wrapper);
    expect(onDevice().exists()).toEqual(false);
    expect(resourcesSize().exists()).toEqual(false);
  });
});
