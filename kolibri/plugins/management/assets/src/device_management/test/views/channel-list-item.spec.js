/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import sinon from 'sinon';
import assert from 'assert';
import ChannelListItem from '../../views/manage-content-page/channel-list-item.vue';
import { mount } from 'avoriaz';

const defaultChannel = {
  name: 'Channel Title',
  version: 20,
  description: 'An awesome channel',
  total_file_size: 5000000000,
  thumbnail: '',
};

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {},
    },
  });
}

function makeWrapper(options = {}) {
  const { props = {}, store } = options;
  const defaultProps = {
    channel: defaultChannel,
    mode: 'managing',
  };
  return mount(ChannelListItem, {
    propsData: Object.assign(defaultProps, props),
    store: store || makeStore(),
  });
}

function getElements(wrapper) {
  return {
    resourcesSizeText: () =>
      wrapper
        .first('.resources-size')
        .text()
        .trim(),
    resourcesSize: () => wrapper.find('.resources-size'),
    onDevice: () => wrapper.find('.on-device'),
    deleteButton: () => wrapper.find('button[name="delete"]'),
    selectButton: () => wrapper.find('button[name="select"]'),
    title: () =>
      wrapper
        .first('.title')
        .text()
        .trim(),
    version: () =>
      wrapper
        .first('.version')
        .text()
        .trim(),
    description: () =>
      wrapper
        .first('.description')
        .text()
        .trim(),
    thumbnail: () => wrapper.first('.thumbnail'),
  };
}

describe('channelListItem', () => {
  describe('in either mode', () => {
    it('shows the channel title, version, and description', () => {
      const wrapper = makeWrapper();
      const { title, version, description } = getElements(wrapper);
      assert.equal(title(), 'Channel Title');
      assert.equal(version(), 'Version 20');
      assert.equal(description(), 'An awesome channel');
    });

    it('shows the thumbnail using encoded string', () => {
      const wrapper = makeWrapper({
        props: {
          channel: Object.assign({}, defaultChannel, {
            thumbnail: 'abcd1234',
          }),
        },
      });
      const { thumbnail } = getElements(wrapper);
      const thumb = thumbnail();
      assert.equal(thumb.first('img').getAttribute('src'), 'abcd1234');
      assert(!thumb.contains('svg'));
    });

    it('defaults to a material design icon if there is no thumbnail', () => {
      const wrapper = makeWrapper();
      const { thumbnail } = getElements(wrapper);
      const thumb = thumbnail();
      assert(thumb.contains('svg'));
      assert(!thumb.contains('img'));
    });
  });

  describe('when in "managing" mode', () => {
    it('shows the file size of the Resources', () => {
      const wrapper = makeWrapper();
      const { resourcesSizeText, onDevice } = getElements(wrapper);
      assert.equal(resourcesSizeText(), '4 GB resources');
      assert.deepEqual(onDevice(), []);
    });

    it('shows a delete button', () => {
      const wrapper = makeWrapper();
      const { deleteButton, selectButton } = getElements(wrapper);
      assert(deleteButton()[0].is('button'));
      // Select button is not shown
      assert.deepEqual(selectButton(), []);
    });

    it('delete button is disabled when there are tasks in queue', () => {
      const store = makeStore();
      store.state.pageState.taskList = [{ id: 'task_1' }];
      const wrapper = makeWrapper({ store });
      const { deleteButton } = getElements(wrapper);
      assert.equal(deleteButton()[0].getAttribute('disabled'), 'disabled');
    });

    it('delete button is not disabled when there are no tasks in queue', () => {
      const store = makeStore();
      store.state.pageState.taskList = [];
      const wrapper = makeWrapper({ store });
      const { deleteButton } = getElements(wrapper);
      assert.equal(deleteButton()[0].hasAttribute('disabled'), false);
    });

    it('clicking delete button triggers "clickdelete" event', () => {
      const wrapper = makeWrapper();
      const emitSpy = sinon.spy(wrapper.vm, '$emit');
      const { deleteButton } = getElements(wrapper);
      deleteButton()[0].trigger('click');
      return wrapper.vm.$nextTick().then(() => {
        sinon.assert.calledOnce(emitSpy);
        sinon.assert.calledWith(emitSpy, 'clickdelete');
      });
    });
  });

  describe('when in "importing" mode', () => {
    const defaultProps = {
      mode: 'importing',
      onDevice: true,
    };

    it('shows a select button', () => {
      const wrapper = makeWrapper({ props: defaultProps });
      const { deleteButton, selectButton } = getElements(wrapper);
      assert(selectButton()[0].is('button'));
      assert.deepEqual(deleteButton(), []);
    });

    it('clicking delete button triggers "clickselect" event', () => {
      const wrapper = makeWrapper({ props: defaultProps });
      const emitSpy = sinon.spy(wrapper.vm, '$emit');
      const { selectButton } = getElements(wrapper);
      selectButton()[0].trigger('click');
      return wrapper.vm.$nextTick().then(() => {
        sinon.assert.calledOnce(emitSpy);
        sinon.assert.calledWith(emitSpy, 'clickselect');
      });
    });

    it('shows the "on device" indicator if channel is installed', () => {
      const wrapper = makeWrapper({ props: defaultProps });
      const { onDevice, resourcesSize } = getElements(wrapper);
      assert(onDevice()[0].is('div'));
      assert.deepEqual(resourcesSize(), []);
    });

    it('does not show the "on device" indicator if channel is not installed', () => {
      const props = Object.assign({}, defaultProps, {
        onDevice: false,
      });
      const wrapper = makeWrapper({ props });
      const { onDevice, resourcesSize } = getElements(wrapper);
      assert.deepEqual(onDevice(), []);
      assert.deepEqual(resourcesSize(), []);
    });
  });
});
