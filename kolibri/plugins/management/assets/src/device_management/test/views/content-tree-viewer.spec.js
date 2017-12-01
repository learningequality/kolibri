/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import assert from 'assert';
import { mount } from 'avoriaz';
import sinon from 'sinon';
import ContentTreeViewer from '../../views/select-content-page/content-tree-viewer.vue';
import ContentNodeRow from '../../views/select-content-page/content-node-row.vue';
import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
import { importExportWizardState } from '../../state/wizardState';
import { makeNode, contentNodeGranularPayload } from '../utils/data';
import mutations from '../../state/mutations';
import omit from 'lodash/omit';

function simplePath(pks) {
  return pks.map(makeNode);
}

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        wizardState: {
          ...importExportWizardState(),
          currentTopicNode: {
            ...contentNodeGranularPayload(),
          },
        },
      },
    },
    mutations,
  });
}

function makeWrapper(options = {}) {
  const { props = {}, store } = options;
  return mount(ContentTreeViewer, {
    propsData: props,
    store: store || makeStore(),
    router: new VueRouter({}),
  });
}

function getElements(wrapper) {
  return {
    // Need to filter out checkboxes in content-node-rows
    selectAllCheckbox: () =>
      wrapper.find(kCheckbox).find(el => el.getProp('label') === 'Select all'),
    emptyState: () => wrapper.first('.no-contents'),
    contentsSection: () => wrapper.find('.contents'),
    firstTopicButton: () => wrapper.find(ContentNodeRow)[0].first('button'),
  };
}

describe('contentTreeViewer component', () => {
  let store;

  function setChildren(children) {
    store.state.pageState.wizardState.currentTopicNode.children = children;
  }

  function setIncludedNodes(nodes) {
    store.state.pageState.wizardState.nodesForTransfer.included = nodes;
  }

  function setOmittedNodes(nodes) {
    store.state.pageState.wizardState.nodesForTransfer.omitted = nodes;
  }

  beforeEach(() => {
    store = makeStore();
  });

  it('in REMOTEIMPORT, all nodes are shown', () => {
    // API does annotate them as being importable, though...
    store.dispatch('SET_TRANSFER_TYPE', 'remoteimport');
    store.dispatch('SET_CURRENT_TOPIC_NODE', {
      pk: 'topic',
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
    const rows = wrapper.find(ContentNodeRow);
    assert.equal(rows.length, 2);
  });

  it('if in LOCALIMPORT, then non-importable nodes are filtered from the list', () => {
    store.dispatch('SET_TRANSFER_TYPE', 'localimport');
    store.dispatch('SET_CURRENT_TOPIC_NODE', {
      pk: 'topic',
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
    const rows = wrapper.find(ContentNodeRow);
    assert.equal(rows.length, 1);
  });

  it('in LOCALEXPORT, if a node has available: false, then it is not shown', () => {
    store.dispatch('SET_TRANSFER_TYPE', 'localexport');
    store.dispatch('SET_CURRENT_TOPIC_NODE', {
      pk: 'topic',
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
    const rows = wrapper.find(ContentNodeRow);
    assert.equal(rows.length, 1);
  });

  it('it shows an empty state if the topic has no children', () => {
    setChildren([]);
    const wrapper = makeWrapper({ store });
    const { contentsSection, emptyState } = getElements(wrapper);
    assert.equal(contentsSection()[0], undefined);
    assert(emptyState().is('div'));
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
      { pk: 'channel_1', title: 'Channel 1' },
      { pk: 'topic_1', title: 'Topic 1' },
    ];
    const wrapper = makeWrapper({ store });
    wrapper.vm.annotatedChildNodes.forEach(n => {
      const expectedPath = [
        { pk: 'channel_1', title: 'Channel 1' },
        { pk: 'topic_1', title: 'Topic 1' },
        { pk: n.pk, title: n.title },
      ];
      assert.deepEqual(n.path, expectedPath);
    });
  });

  xit('the correct breadcrumbs appear on the top', () => {
    // TODO create breadcrumb util to convert path -> breadrumbs.items prop
  });

  describe('loading and error states', () => {
    it('shows loading screen when loading', () => {});

    it('removes loading screen when loaded', () => {});

    it('shows an error state if there was an error loading node', () => {});
  });

  describe('"select all" checkbox state', () => {
    // These are integration tests with component and annotateNode utility
    function checkboxIsChecked(wrapper) {
      const { selectAllCheckbox } = getElements(wrapper);
      return selectAllCheckbox().getProp('checked');
    }

    it('if neither topic nor any ancestor is selected, then "Select All" is unchecked', () => {
      const wrapper = makeWrapper({ store });
      assert.equal(checkboxIsChecked(wrapper), false);
    });
    it('if any ancestor of the topic is selected, then "Select All" is checked', () => {
      store.state.pageState.wizardState.path = [{ pk: 'channel_1' }];
      setIncludedNodes([makeNode('channel_1')]);
      const wrapper = makeWrapper({ store });
      assert.equal(checkboxIsChecked(wrapper), true);
    });

    it('if the topic itself is selected, then "Select All" is checked', () => {
      setIncludedNodes([makeNode('topic_1')]);
      const wrapper = makeWrapper({ store });
      assert.equal(checkboxIsChecked(wrapper), true);
    });

    it('if topic is selected, but one descendant is omitted', () => {
      // ...then "Select All" is unchecked
      setIncludedNodes([makeNode('topic_1')]);
      setOmittedNodes([makeNode('subtopic_1', { path: [{ pk: 'topic_1' }] })]);
      const wrapper = makeWrapper({ store });
      assert.equal(checkboxIsChecked(wrapper), false);
    });
  });

  describe('toggling "select all" checkbox', () => {
    it('if unchecked, clicking the "Select All" for the topic triggers an "add node" action', () => {
      // Selected w/ unselected child scenario
      setIncludedNodes([makeNode('topic_1', { total_resources: 1000 })]);
      setOmittedNodes([makeNode('subtopic_1', { path: [{ pk: 'topic_1', title: '' }] })]);
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
      return wrapper.vm.$nextTick().then(() => {
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
  });

  describe('selecting child nodes', () => {
    it('clicking a checked child node triggers a "remove node" action', () => {
      const subTopic = makeNode('subtopic_1', {
        path: [{ pk: 'subtopic_1', title: 'node_subtopic_1' }],
        total_resources: 100,
        on_device_resources: 50,
      });
      setChildren([subTopic]);
      setIncludedNodes([subTopic]);
      const wrapper = makeWrapper({ store });
      const removeNodeStub = sinon
        .stub(wrapper.vm, 'removeNodeForTransfer')
        .returns(Promise.resolve());
      const topicRow = wrapper.first(ContentNodeRow);
      assert.equal(topicRow.getProp('checked'), true);
      assert.equal(topicRow.getProp('disabled'), false);
      topicRow.first('input[type="checkbox"]').trigger('click');
      return wrapper.vm.$nextTick().then(() => {
        sinon.assert.calledOnce(removeNodeStub);
        sinon.assert.calledWithMatch(removeNodeStub, subTopic);
      });
    });

    it('clicking an unchecked child node triggers an "add node" action', () => {
      // Need to add at least two children, so clicking subtopic doesn't complete the topic
      const subTopic = makeNode('subtopic_1', {
        path: [{ pk: 'subtopic_1', title: 'node_subtopic_1' }],
        total_resources: 100,
        on_device_resources: 50,
      });
      const subTopic2 = makeNode('subtopic_2', {
        path: [{ pk: 'subtopic_1', title: 'node_subtopic_1' }],
        total_resources: 100,
        on_device_resources: 50,
      });
      setChildren([subTopic, subTopic2]);
      const wrapper = makeWrapper({ store });
      const addNodeStub = sinon.stub(wrapper.vm, 'addNodeForTransfer').returns(Promise.resolve());
      const topicRow = wrapper.first(ContentNodeRow);
      assert.equal(topicRow.getProp('checked'), false);
      topicRow.first('input[type="checkbox"]').trigger('click');
      return wrapper.vm.$nextTick().then(() => {
        sinon.assert.calledOnce(addNodeStub);
        sinon.assert.calledWithMatch(addNodeStub, subTopic);
      });
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
      const topicRow = wrapper.first(ContentNodeRow);
      assert.equal(topicRow.getProp('checked'), false);
      assert.equal(topicRow.getProp('indeterminate'), true);
      topicRow.first('input[type="checkbox"]').trigger('click');
      return wrapper.vm.$nextTick().then(() => {
        sinon.assert.calledOnce(addNodeStub);
        sinon.assert.calledWithMatch(addNodeStub, { pk: 'subtopic' });
      });
    });
  });

  xit('clicking an indeterminate or unchecked child node that completes the parent', () => {
    // ...triggers an "add node" action with the parent topic
  });
});
