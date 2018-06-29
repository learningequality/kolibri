/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import VueRouter from 'vue-router';
import { expect } from 'chai';
import { mount } from '@vue/test-utils';
import ChannelListItem from '../../src/views/manage-content-page/channel-list-item.vue';
import { defaultChannel } from '../utils/data';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

function makeWrapper(options = {}) {
  const { props = {}, store } = options;
  const defaultProps = {
    channel: {
      ...defaultChannel,
      thumbnail: 'data:image/png;base64,abcd1234',
    },
    mode: 'MANAGE',
    onDevice: false,
  };
  return mount(ChannelListItem, {
    propsData: { ...defaultProps, ...props },
    store: store || makeAvailableChannelsPageStore(),
    router: new VueRouter({ routes: [] }),
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    resourcesSizeText: () => wrapper.find('.resources-size').text().trim(),
    resourcesSize: () => wrapper.find('.resources-size'),
    onDevice: () => wrapper.find('.on-device'),
    selectButton: () => wrapper.find({ name: 'kRouterLink' }),
    title: () => wrapper.find('.title').text().trim(),
    version: () => wrapper.find('.version').text().trim(),
    description: () => wrapper.find('.description').text().trim(),
    thumbnail: () => wrapper.find('.thumbnail'),
    addTaskMutation: (task) => wrapper.vm.$store.dispatch('SET_CONTENT_PAGE_TASKS', [task]),
    dropdownMenu: () => wrapper.find({ name: 'kDropdownMenu' }),
  };
}

const fakeImage = 'data:image/png;base64,abcd1234';

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
        expect(title()).to.equal('Channel Title');
        expect(version()).to.equal('Version 10');
        expect(description()).to.equal('An awesome channel');
      }
      testAll(test);
    });

    it('shows the thumbnail using encoded string', () => {
      function test(wrapper) {
        wrapper.setProps({ channel: { ...defaultChannel, thumbnail: fakeImage } });
        const { thumbnail } = getElements(wrapper);
        const thumb = thumbnail();
        expect(thumb.find('img').attributes().src).to.equal(fakeImage);
        expect(thumb.contains('svg')).to.be.false;
      }
      testAll(test);
    });

    it('defaults to a material design icon if there is no thumbnail', () => {
      function test(wrapper) {
        const { thumbnail } = getElements(wrapper);
        wrapper.setProps({ channel: { ...defaultChannel, thumbnail: '' } });
        const thumb = thumbnail();
        expect(thumb.contains('svg')).to.be.true;
        expect(thumb.contains('img')).to.be.false;
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
    expect(version()).to.equal('Version 10');
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
    expect(version()).to.equal('Version 20');
  });

  it('in MANAGE/EXPORT shows the on-device file sizes of Resources', () => {
    // ...and does not show the "On Device" indicator
    function test(wrapper) {
      const { resourcesSizeText, onDevice } = getElements(wrapper);
      expect(resourcesSizeText()).to.equal('90 MB');
      expect(onDevice().exists()).to.be.false;
    }
    test(manageWrapper);
    test(exportWrapper);
  });

  it('in MANAGE mode only, clicking "delete" triggers a "clickdelete" event', () => {
    const wrapper = manageWrapper;
    const { dropdownMenu, selectButton } = getElements(wrapper);
    // Select button is not shown
    expect(selectButton().exists()).to.be.false;
    return wrapper.vm.$nextTick().then(() => {
      // HACK trigger an event from dropdown menu options, since the actual button is hard to target
      dropdownMenu().vm.$emit('select', { value: 'DELETE_CHANNEL' });
      expect(wrapper.emitted().clickdelete.length).to.equal(1);
    });
  });

  it('in MANAGE mode only, delete button is disabled when tasks in queue', () => {
    const wrapper = manageWrapper;
    const { dropdownMenu, addTaskMutation } = getElements(wrapper);
    addTaskMutation({ id: 'task_1' });
    return wrapper.vm.$nextTick().then(() => {
      // prettier-ignore
      expect(dropdownMenu().props().disabled).to.be.true
    });
  });

  it('in IMPORT/EXPORT mode, "select" button is disabled when tasks in queue', () => {
    function test(wrapper) {
      const { selectButton, addTaskMutation } = getElements(wrapper);
      addTaskMutation({ id: 'task_1' });
      return wrapper.vm.$nextTick().then(() => {
        // prettier-ignore
        expect(selectButton().attributes().disabled).to.equal('disabled');
      });
    }
    return Promise.all([test(importWrapper), test(exportWrapper)]);
  });

  it('in IMPORT mode only, shows an "on device" indicator if channel is installed', () => {
    function posTest(wrapper) {
      wrapper.setProps({ onDevice: true });
      const { onDevice, resourcesSize } = getElements(wrapper);
      expect(onDevice().exists()).to.be.true;
      expect(resourcesSize().exists()).to.be.false;
    }
    function negTest(wrapper) {
      wrapper.setProps({ onDevice: true });
      const { onDevice } = getElements(wrapper);
      expect(onDevice().exists()).to.be.false;
    }
    posTest(importWrapper);
    negTest(exportWrapper);
    negTest(manageWrapper);
  });

  it('in IMPORT mode only, does not show the "on device" indicator if channel is not installed', () => {
    const wrapper = importWrapper;
    wrapper.setProps({ onDevice: false });
    const { onDevice, resourcesSize } = getElements(wrapper);
    expect(onDevice().exists()).to.be.false;
    expect(resourcesSize().exists()).to.be.false;
  });
});
