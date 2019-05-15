import VueRouter from 'vue-router';
import { mount } from '@vue/test-utils';
import omit from 'lodash/fp/omit';
import ContentTreeViewer from '../../src/views/SelectContentPage/ContentTreeViewer';
import { makeNode } from '../utils/data';
import { makeSelectContentPageStore } from '../utils/makeStore';

function simplePath(ids) {
  return ids.map(makeNode);
}

//
function makeWrapper(options = {}) {
  const { props = {}, store } = options;
  return mount(ContentTreeViewer, {
    propsData: props,
    store: store || makeSelectContentPageStore(),
    router: new VueRouter({
      routes: [{ name: 'SELECT_CONTENT_TOPIC', path: 'topic' }],
    }),
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    // Need to filter out checkboxes in content-node-rows
    selectAllCheckbox: () => wrapper.findAll({ name: 'KCheckbox' }).filter(el => el.props().label === 'Select all').at(0),
    emptyState: () => wrapper.find('.no-contents'),
    contentsSection: () => wrapper.findAll('.contents'),
    firstTopicButton: () => wrapper.find({ name: 'ContentNodeRow' }).find('a'),
    contentNodeRows: () => wrapper.findAll({ name: 'ContentNodeRow' }),
    addNodeForTransferMock: () => {
      const mock = wrapper.vm.addNodeForTransfer = jest.fn().mockResolvedValue();
      return mock;
    },
    removeNodeForTransferMock: () => {
      const mock = wrapper.vm.removeNodeForTransfer = jest.fn().mockResolvedValue();
      return mock;
    },
  };
}

describe('contentTreeViewer component', () => {
  let store;

  function setChildren(children) {
    store.state.manageContent.wizard.currentTopicNode.children = children;
  }

  function setIncludedNodes(nodes) {
    store.commit('manageContent/wizard/REPLACE_INCLUDE_LIST', nodes);
  }

  function setOmittedNodes(nodes) {
    store.commit('manageContent/wizard/REPLACE_OMIT_LIST', nodes);
  }

  beforeEach(() => {
    store = makeSelectContentPageStore();
  });

  it('it shows an empty state if the topic has no children', () => {
    setChildren([]);
    const wrapper = makeWrapper({ store });
    const { contentsSection, emptyState } = getElements(wrapper);
    expect(contentsSection()).toHaveLength(0);
    expect(emptyState().is('div')).toEqual(true);
  });

  it('when clicking a topic-title button on a row, a "update topic" action is trigged', () => {
    const wrapper = makeWrapper({ store });
    const { firstTopicButton } = getElements(wrapper);
    const { mock } = (wrapper.vm.updateCurrentTopicNode = jest.fn());
    firstTopicButton().trigger('click');
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0][0]).toEqual(wrapper.vm.annotatedChildNodes[0]);
  });

  it('child nodes are annotated with their full path', () => {
    store.state.manageContent.wizard.path = [
      { id: 'channel_1', title: 'Channel 1' },
      { id: 'topic_1', title: 'Topic 1' },
    ];
    const wrapper = makeWrapper({ store });
    wrapper.vm.annotatedChildNodes.forEach(n => {
      const expectedPath = [
        { id: 'channel_1', title: 'Channel 1' },
        { id: 'topic_1', title: 'Topic 1' },
        { id: n.id, title: n.title },
      ];
      expect(n.path).toEqual(expectedPath);
    });
  });

  describe('"select all" checkbox state', () => {
    // These are integration tests with component and annotateNode utility
    function checkboxIsChecked(wrapper) {
      const { selectAllCheckbox } = getElements(wrapper);
      return selectAllCheckbox().props().checked;
    }

    it('if neither topic nor any ancestor is selected, then "Select All" is unchecked', () => {
      const wrapper = makeWrapper({ store });
      expect(checkboxIsChecked(wrapper)).toEqual(false);
    });
    it('if any ancestor of the topic is selected, then "Select All" is checked', () => {
      store.state.manageContent.wizard.path = [{ id: 'channel_1' }];
      setIncludedNodes([makeNode('channel_1')]);
      const wrapper = makeWrapper({ store });
      expect(checkboxIsChecked(wrapper)).toEqual(true);
    });

    it('if the topic itself is selected, then "Select All" is checked', () => {
      setIncludedNodes([makeNode('topic_1')]);
      const wrapper = makeWrapper({ store });
      expect(checkboxIsChecked(wrapper)).toEqual(true);
    });

    it('if topic is selected, but one descendant is omitted', () => {
      // ...then "Select All" is unchecked
      setIncludedNodes([makeNode('topic_1')]);
      setOmittedNodes([makeNode('subtopic_1', { path: [{ id: 'topic_1' }] })]);
      const wrapper = makeWrapper({ store });
      expect(checkboxIsChecked(wrapper)).toEqual(false);
    });
  });

  describe('toggling "select all" checkbox', () => {
    const sanitizeNode = omit(['message', 'checkboxType', 'disabled', 'children']);
    it('if unchecked, clicking the "Select All" for the topic triggers an "add node" action', () => {
      // Selected w/ unselected child scenario
      setIncludedNodes([makeNode('topic_1', { importable_resources: 1000 })]);
      setOmittedNodes([makeNode('subtopic_1', { path: [{ id: 'topic_1', title: '' }] })]);
      const wrapper = makeWrapper({ store });
      const { selectAllCheckbox, addNodeForTransferMock } = getElements(wrapper);
      const addNodeMock = addNodeForTransferMock();
      selectAllCheckbox().trigger('click');
      expect(addNodeMock).toHaveBeenCalledTimes(1);
      expect(addNodeMock).toHaveBeenCalledWith(
        expect.objectContaining(sanitizeNode(wrapper.vm.annotatedTopicNode))
      );
    });

    it('if topic is checked, clicking the "Select All" for the topic triggers a "remove node" action', () => {
      setIncludedNodes([makeNode('topic_1')]);
      const wrapper = makeWrapper({ store });
      const { selectAllCheckbox, removeNodeForTransferMock } = getElements(wrapper);
      const removeNodeMock = removeNodeForTransferMock();
      selectAllCheckbox().trigger('click');
      expect(removeNodeMock).toHaveBeenCalledTimes(1);
      expect(removeNodeMock).toHaveBeenCalledWith(
        expect.objectContaining(sanitizeNode(wrapper.vm.annotatedTopicNode))
      );
    });
  });

  describe('selecting child nodes', () => {
    it('clicking a checked child node triggers a "remove node" action', () => {
      const subTopic = makeNode('subtopic_1', {
        path: [{ id: 'subtopic_1', title: 'node_subtopic_1' }],
        importable_resources: 100,
        on_device_resources: 50,
      });
      setChildren([subTopic]);
      setIncludedNodes([subTopic]);
      const wrapper = makeWrapper({ store });
      const { removeNodeForTransferMock } = getElements(wrapper);
      const { mock } = removeNodeForTransferMock();
      const topicRow = wrapper.find({ name: 'ContentNodeRow' });
      expect(topicRow.props().checked).toEqual(true);
      expect(topicRow.props().disabled).toEqual(false);
      topicRow.find('input[type="checkbox"]').trigger('click');
      expect(mock.calls).toHaveLength(1);
      expect(mock.calls[0][0]).toMatchObject(subTopic);
    });

    it('clicking an unchecked child node triggers an "add node" action', () => {
      // Need to add at least two children, so clicking subtopic doesn't complete the topic
      const subTopic = makeNode('subtopic_1', {
        path: [{ id: 'subtopic_1', title: 'node_subtopic_1' }],
        importable_resources: 100,
        on_device_resources: 50,
      });
      const subTopic2 = makeNode('subtopic_2', {
        path: [{ id: 'subtopic_1', title: 'node_subtopic_1' }],
        importable_resources: 100,
        on_device_resources: 50,
      });
      setChildren([subTopic, subTopic2]);
      const wrapper = makeWrapper({ store });
      const { addNodeForTransferMock } = getElements(wrapper);
      const { mock } = addNodeForTransferMock();
      const topicRow = wrapper.find({ name: 'ContentNodeRow' });
      expect(topicRow.props().checked).toEqual(false);
      topicRow.find('input[type="checkbox"]').trigger('click');
      expect(mock.calls).toHaveLength(1);
      expect(mock.calls[0][0]).toMatchObject(subTopic);
    });

    it('clicking an indeterminate child node triggers an "add node" action', () => {
      const subTopic = makeNode('subtopic', {
        path: simplePath(['channel_1', 'topic_1']),
        importable_resources: 5,
      });
      const subTopic2 = makeNode('subtopic2', {
        path: simplePath(['channel_1', 'topic_1']),
        importable_resources: 5,
      });
      const subSubTopic = makeNode('subsubtopic', {
        path: simplePath(['channel_1', 'topic_1', 'subtopic']),
        importable_resources: 1,
      });

      store.state.manageContent.wizard.path = simplePath(['channel_1']);
      setChildren([subTopic, subTopic2]);
      setIncludedNodes([subSubTopic]);
      const wrapper = makeWrapper({ store });
      const { addNodeForTransferMock } = getElements(wrapper);
      const { mock } = addNodeForTransferMock();
      const topicRow = wrapper.find({ name: 'ContentNodeRow' });
      expect(topicRow.props().checked).toEqual(false);
      expect(topicRow.props().indeterminate).toEqual(true);
      topicRow.find('input[type="checkbox"]').trigger('click');
      expect(mock.calls).toHaveLength(1);
      expect(mock.calls[0][0]).toMatchObject({ id: 'subtopic' });
    });
  });
});
