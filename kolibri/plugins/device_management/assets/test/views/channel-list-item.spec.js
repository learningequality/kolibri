/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import sinon from 'sinon';
import assert from 'assert';
import ChannelListItem from '../../src/views/manage-content-page/channel-list-item.vue';
import { mount } from '@vue/test-utils';
import { defaultChannel } from '../utils/data';

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        taskList: [],
        channelList: [{ id: 'installed', name: 'Installed Channel', version: 11, available: true }],
      },
    },
    mutations: {
      addTask(state, task) {
        state.pageState.taskList.push(task);
      },
    },
  });
}

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
    store: store || makeStore(),
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    resourcesSizeText: () => wrapper.find('.resources-size').text().trim(),
    resourcesSize: () => wrapper.find('.resources-size'),
    onDevice: () => wrapper.find('.on-device'),
    deleteButton: () => wrapper.find('button[name="delete"]'),
    selectButton: () => wrapper.find('button[name="select"]'),
    title: () => wrapper.find('.title').text().trim(),
    version: () => wrapper.find('.version').text().trim(),
    description: () => wrapper.find('.description').text().trim(),
    thumbnail: () => wrapper.find('.thumbnail'),
    addTaskMutation: (task) => wrapper.vm.$store.dispatch('addTask', task),
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
        assert.equal(title(), 'Channel Title');
        assert.equal(version(), 'Version 20');
        assert.equal(description(), 'An awesome channel');
      }
      testAll(test);
    });

    it('shows the thumbnail using encoded string', () => {
      function test(wrapper) {
        wrapper.setProps({ thumbnail: fakeImage });
        const { thumbnail } = getElements(wrapper);
        const thumb = thumbnail();
        assert.equal(thumb.find('img').attributes().src, fakeImage);
        assert(!thumb.contains('svg'));
      }
      testAll(test);
    });

    it('defaults to a material design icon if there is no thumbnail', () => {
      function test(wrapper) {
        const { thumbnail } = getElements(wrapper);
        wrapper.setProps({ channel: { ...defaultChannel, thumbnail: '' } });
        const thumb = thumbnail();
        assert(thumb.contains('svg'));
        assert(!thumb.contains('img'));
      }
      testAll(test);
    });
  });

  xit('shows an icon if the channel is unlisted', () => {});

  it('if the channel is installed, the version number is of the installed channel', () => {
    importWrapper.setProps({
      onDevice: true,
      channel: {
        id: 'installed',
        version: 20,
      },
    });
    const { version } = getElements(importWrapper);
    assert.equal(version(), 'Version 11');
  });

  it('if the channel is not installed, the version number is of the remote channel', () => {
    importWrapper.setProps({
      onDevice: true,
      channel: {
        id: 'not_installed',
        version: 20,
      },
    });
    const { version } = getElements(importWrapper);
    assert.equal(version(), 'Version 20');
  });

  it('in MANAGE/EXPORT shows the on-device file sizes of Resources', () => {
    // ...and does not show the "On Device" indicator
    function test(wrapper) {
      const { resourcesSizeText, onDevice } = getElements(wrapper);
      assert.equal(resourcesSizeText(), '90 MB');
      assert(!onDevice().exists());
    }
    test(manageWrapper);
    test(exportWrapper);
  });

  it('in MANAGE mode only, clicking "delete" triggers a "clickdelete" event', () => {
    const wrapper = manageWrapper;
    const { deleteButton, selectButton } = getElements(wrapper);
    const emitSpy = sinon.spy(wrapper.vm, '$emit');
    // Select button is not shown
    assert(!selectButton().exists());
    // prettier-ignore
    deleteButton().trigger('click');
    sinon.assert.calledOnce(emitSpy);
    sinon.assert.calledWith(emitSpy, 'clickdelete');
  });

  it('in MANAGE mode only, delete button is disabled when tasks in queue', () => {
    const wrapper = manageWrapper;
    const { deleteButton, addTaskMutation } = getElements(wrapper);
    addTaskMutation({ id: 'task_1' });
    return wrapper.vm.$nextTick().then(() => {
      // prettier-ignore
      assert.equal(deleteButton().attributes().disabled, 'disabled');
    });
  });

  it('in IMPORT/EXPORT mode, clicking "select" triggers a "clickselect" event', () => {
    function test(wrapper) {
      const emitSpy = sinon.spy(wrapper.vm, '$emit');
      const { selectButton } = getElements(wrapper);
      // prettier-ignore
      selectButton().trigger('click');
      sinon.assert.calledOnce(emitSpy);
      sinon.assert.calledWith(emitSpy, 'clickselect');
    }
    return Promise.all([test(importWrapper), test(exportWrapper)]);
  });

  it('in IMPORT/EXPORT mode, "select" button is disabled when tasks in queue', () => {
    function test(wrapper) {
      const { selectButton, addTaskMutation } = getElements(wrapper);
      addTaskMutation({ id: 'task_1' });
      return wrapper.vm.$nextTick().then(() => {
        // prettier-ignore
        assert.equal(selectButton().attributes().disabled, 'disabled');
      });
    }
    return Promise.all([test(importWrapper), test(exportWrapper)]);
  });

  it('in IMPORT mode only, shows an "on device" indicator if channel is installed', () => {
    function posTest(wrapper) {
      wrapper.setProps({ onDevice: true });
      const { onDevice, resourcesSize } = getElements(wrapper);
      assert(onDevice().exists());
      assert(!resourcesSize().exists());
    }
    function negTest(wrapper) {
      wrapper.setProps({ onDevice: true });
      const { onDevice } = getElements(wrapper);
      assert(!onDevice().exists());
    }
    posTest(importWrapper);
    negTest(exportWrapper);
    negTest(manageWrapper);
  });

  it('in IMPORT mode only, does not show the "on device" indicator if channel is not installed', () => {
    const wrapper = importWrapper;
    wrapper.setProps({ onDevice: false });
    const { onDevice, resourcesSize } = getElements(wrapper);
    assert(!onDevice().exists());
    assert(!resourcesSize().exists());
  });
});
