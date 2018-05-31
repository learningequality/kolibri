/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import VueRouter from 'vue-router';
import { mount } from '@vue/test-utils';
import sinon from 'sinon';
import omit from 'lodash/omit';
import ContentTreeViewer from '../../src/views/select-content-page/content-tree-viewer.vue';
import { makeNode } from '../utils/data';
import { makeSelectContentPageStore } from '../utils/makeStore';

function simplePath(ids) {
  return ids.map(makeNode);
}

function makeWrapper(options = {}) {
  const { props = {}, store } = options;
  return mount(ContentTreeViewer, {
    propsData: props,
    store: store || makeSelectContentPageStore(),
    router: new VueRouter({}),
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    // Need to filter out checkboxes in content-node-rows
    selectAllCheckbox: () => wrapper.findAll({ name: 'kCheckbox' }).filter(el => el.props().label === 'Select all').at(0),
    emptyState: () => wrapper.find('.no-contents'),
    contentsSection: () => wrapper.findAll('.contents'),
    firstTopicButton: () => wrapper.find({ name: 'contentNodeRow' }).find('button'),
    contentNodeRows: () => wrapper.findAll({ name: 'contentNodeRow' }),
  };
}

describe('contentTreeViewer component', () => {
  let store;

  function setChildren(children) {
    store.state.pageState.wizardState.currentTopicNode.children = children;
  }

  function setIncludedNodes(nodes) {
    store.dispatch('REPLACE_INCLUDE_LIST', nodes);
  }

  function setOmittedNodes(nodes) {
    store.dispatch('REPLACE_OMIT_LIST', nodes);
  }

  beforeEach(() => {
    store = makeSelectContentPageStore();
  });

  it('in REMOTEIMPORT, all nodes are shown', () => {
    // API does annotate them as being importable, though...
    store.dispatch('SET_TRANSFER_TYPE', 'remoteimport');
    store.dispatch('SET_CURRENT_TOPIC_NODE', {
      id: 'topic',
      children: [
        {
          ...makeNode('1'),
          available: false,
          importable: true,
        },
        {
          ...makeNode('1'),
          available: true,
          importable: true,
        },
      ],
    });
    const wrapper = makeWrapper({ store });
    const rows = wrapper.findAll({ name: 'contentNodeRow' });
    expect(rows).to.have.lengthOf(2);
  });

  it('if in LOCALIMPORT, then non-importable nodes are filtered from the list', () => {
    store.dispatch('SET_TRANSFER_TYPE', 'localimport');
    store.dispatch('SET_CURRENT_TOPIC_NODE', {
      id: 'topic',
      children: [
        {
          ...makeNode('1'),
          importable: true,
        },
        {
          ...makeNode('1'),
          importable: false,
        },
      ],
    });
    const wrapper = makeWrapper({ store });
    const { contentNodeRows } = getElements(wrapper);
    expect(contentNodeRows()).to.have.lengthOf(1);
  });

  it('in LOCALEXPORT, if a node has available: false, then it is not shown', () => {
    store.dispatch('SET_TRANSFER_TYPE', 'localexport');
    store.dispatch('SET_CURRENT_TOPIC_NODE', {
      id: 'topic',
      children: [
        {
          ...makeNode('1'),
          available: true,
          importable: true,
        },
        {
          ...makeNode('1'),
          available: false,
          importable: false,
        },
      ],
    });
    const wrapper = makeWrapper({ store });
    const { contentNodeRows } = getElements(wrapper);
    expect(contentNodeRows()).to.have.lengthOf(1);
  });

  it('it shows an empty state if the topic has no children', () => {
    setChildren([]);
    const wrapper = makeWrapper({ store });
    const { contentsSection, emptyState } = getElements(wrapper);
    expect(contentsSection()).to.have.lengthOf(0);
    expect(emptyState().is('div')).to.be.true;
  });

  it('when clicking a topic-title button on a row, a "update topic" action is trigged', () => {
    const wrapper = makeWrapper({ store });
    const { firstTopicButton } = getElements(wrapper);
    const updateTopicStub = sinon.stub(wrapper.vm, 'updateCurrentTopicNode');
    firstTopicButton().trigger('click');
    return wrapper.vm.$nextTick().then(() => {
      sinon.assert.calledOnce(updateTopicStub);
      sinon.assert.calledWith(updateTopicStub, wrapper.vm.annotatedChildNodes[0]);
    });
  });

  it('child nodes are annotated with their full path', () => {
    store.state.pageState.wizardState.path = [
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
      expect(n.path).to.deep.equal(expectedPath);
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
      expect(checkboxIsChecked(wrapper)).to.be.false;
    });
    it('if any ancestor of the topic is selected, then "Select All" is checked', () => {
      store.state.pageState.wizardState.path = [{ id: 'channel_1' }];
      setIncludedNodes([makeNode('channel_1')]);
      const wrapper = makeWrapper({ store });
      expect(checkboxIsChecked(wrapper)).to.be.true;
    });

    it('if the topic itself is selected, then "Select All" is checked', () => {
      setIncludedNodes([makeNode('topic_1')]);
      const wrapper = makeWrapper({ store });
      expect(checkboxIsChecked(wrapper)).to.be.true;
    });

    it('if topic is selected, but one descendant is omitted', () => {
      // ...then "Select All" is unchecked
      setIncludedNodes([makeNode('topic_1')]);
      setOmittedNodes([makeNode('subtopic_1', { path: [{ id: 'topic_1' }] })]);
      const wrapper = makeWrapper({ store });
      expect(checkboxIsChecked(wrapper)).to.be.false;
    });
  });

  describe('toggling "select all" checkbox', () => {
    it('if unchecked, clicking the "Select All" for the topic triggers an "add node" action', () => {
      // Selected w/ unselected child scenario
      setIncludedNodes([makeNode('topic_1', { total_resources: 1000 })]);
      setOmittedNodes([makeNode('subtopic_1', { path: [{ id: 'topic_1', title: '' }] })]);
      const wrapper = makeWrapper({ store });
      const { selectAllCheckbox } = getElements(wrapper);
      const addNodeStub = sinon.stub(wrapper.vm, 'addNodeForTransfer').returns(Promise.resolve());
      selectAllCheckbox().trigger('click');
      return wrapper.vm.$nextTick().then(() => {
        const sanitized = omit(wrapper.vm.annotatedTopicNode, [
          'message',
          'checkboxType',
          'disabled',
          'children',
        ]);
        sinon.assert.calledOnce(addNodeStub);
        sinon.assert.calledWithMatch(addNodeStub, sanitized);
      });
    });

    it('if topic is checked, clicking the "Select All" for the topic triggers a "remove node" action', () => {
      setIncludedNodes([makeNode('topic_1')]);
      const wrapper = makeWrapper({ store });
      const removeNodeStub = sinon
        .stub(wrapper.vm, 'removeNodeForTransfer')
        .returns(Promise.resolve());
      const { selectAllCheckbox } = getElements(wrapper);
      selectAllCheckbox().trigger('click');
      const sanitized = omit(wrapper.vm.annotatedTopicNode, [
        'message',
        'checkboxType',
        'disabled',
        'children',
      ]);
      sinon.assert.calledOnce(removeNodeStub);
      sinon.assert.calledWithMatch(removeNodeStub, sanitized);
    });
  });

  describe('selecting child nodes', () => {
    it('clicking a checked child node triggers a "remove node" action', () => {
      const subTopic = makeNode('subtopic_1', {
        path: [{ id: 'subtopic_1', title: 'node_subtopic_1' }],
        total_resources: 100,
        on_device_resources: 50,
      });
      setChildren([subTopic]);
      setIncludedNodes([subTopic]);
      const wrapper = makeWrapper({ store });
      const removeNodeStub = sinon
        .stub(wrapper.vm, 'removeNodeForTransfer')
        .returns(Promise.resolve());
      const topicRow = wrapper.find({ name: 'contentNodeRow' });
      expect(topicRow.props().checked).to.be.true;
      expect(topicRow.props().disabled).to.be.false;
      topicRow.find('input[type="checkbox"]').trigger('click');
      sinon.assert.calledOnce(removeNodeStub);
      sinon.assert.calledWithMatch(removeNodeStub, subTopic);
    });

    it('clicking an unchecked child node triggers an "add node" action', () => {
      // Need to add at least two children, so clicking subtopic doesn't complete the topic
      const subTopic = makeNode('subtopic_1', {
        path: [{ id: 'subtopic_1', title: 'node_subtopic_1' }],
        total_resources: 100,
        on_device_resources: 50,
      });
      const subTopic2 = makeNode('subtopic_2', {
        path: [{ id: 'subtopic_1', title: 'node_subtopic_1' }],
        total_resources: 100,
        on_device_resources: 50,
      });
      setChildren([subTopic, subTopic2]);
      const wrapper = makeWrapper({ store });
      const addNodeStub = sinon.stub(wrapper.vm, 'addNodeForTransfer').returns(Promise.resolve());
      const topicRow = wrapper.find({ name: 'contentNodeRow' });
      expect(topicRow.props().checked).to.be.false;
      topicRow.find('input[type="checkbox"]').trigger('click');
      sinon.assert.calledOnce(addNodeStub);
      sinon.assert.calledWithMatch(addNodeStub, subTopic);
    });

    it('clicking an indeterminate child node triggers an "add node" action', () => {
      const subTopic = makeNode('subtopic', {
        path: simplePath(['channel_1', 'topic_1']),
        total_resources: 5,
      });
      const subTopic2 = makeNode('subtopic2', {
        path: simplePath(['channel_1', 'topic_1']),
        total_resources: 5,
      });
      const subSubTopic = makeNode('subsubtopic', {
        path: simplePath(['channel_1', 'topic_1', 'subtopic']),
        total_resources: 1,
      });

      store.state.pageState.wizardState.path = simplePath(['channel_1']);
      setChildren([subTopic, subTopic2]);
      setIncludedNodes([subSubTopic]);
      const wrapper = makeWrapper({ store });
      const addNodeStub = sinon.stub(wrapper.vm, 'addNodeForTransfer').returns(Promise.resolve());
      const topicRow = wrapper.find({ name: 'contentNodeRow' });
      expect(topicRow.props().checked).to.be.false;
      expect(topicRow.props().indeterminate).to.be.true;
      topicRow.find('input[type="checkbox"]').trigger('click');
      sinon.assert.calledOnce(addNodeStub);
      sinon.assert.calledWithMatch(addNodeStub, { id: 'subtopic' });
    });
  });
});
