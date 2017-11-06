/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import { mount } from 'avoriaz';
import sinon from 'sinon';
import ContentTreeViewer from '../../views/select-content-page/content-tree-viewer.vue';
import ContentNodeRow from '../../views/select-content-page/content-node-row.vue';
import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
import { makeNode, selectContentsPageState } from '../utils/data';

const channelNode = () => makeNode('channel_1');
const topicNode = () => makeNode('topic_1_1', { path: [channelNode().pk] });

function makeStore() {
  const state = {
    pageState: {
      wizardState: selectContentsPageState(),
    },
  };
  return new Vuex.Store({ state });
}

function makeWrapper(options = {}) {
  const { props = {}, store } = options
  return mount(ContentTreeViewer, {
    propsData: props,
    store: store || makeStore(),
  });
}

function getElements(wrapper) {
  return {
    // Need to filter out checkboxes in content-node-rows
    selectAllCheckbox: () => wrapper.find(kCheckbox).find(el => el.getProp('label') === 'Select all'),
    emptyState: () => wrapper.first('.no-contents'),
    contentsSection: () => wrapper.find('.contents'),
    firstTopicButton: () => wrapper.find(ContentNodeRow)[0].first('button'),
  }
}

describe('contentTreeViewer component', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
  });

  it('shows one content-node-row for each importable node in topic', () => {
    const wrapper = makeWrapper();
    const rows = wrapper.find(ContentNodeRow);
    assert.equal(rows.length, 2);
  });

  xit('if in import mode, then non-importable nodes are filtered from the list', () => {});

  it('it shows an empty state if the topic has no children', () => {
    store.state.pageState.wizardState.treeView.currentNode.children = [];
    const wrapper = makeWrapper({ store });
    const { contentsSection, emptyState } = getElements(wrapper);
    assert.equal(contentsSection()[0], undefined);
    assert(emptyState().is('div'));
  });

  it('when clicking a topic-title button on a row, a "go to topic" action is trigged', () => {
    const wrapper = makeWrapper({ store });
    const { firstTopicButton } = getElements(wrapper);
    const goToTopicStub = sinon.stub(wrapper.vm, 'goToTopic');
    firstTopicButton().trigger('click');
    return wrapper.vm.$nextTick()
      .then(() => {
        sinon.assert.calledOnce(goToTopicStub);
        sinon.assert.calledWith(goToTopicStub, wrapper.vm.annotatedChildNodes[0]);
      });
  });

  it('child nodes are annotated with the path of topic', () => {
    store.state.pageState.wizardState.path = ['channel_1'];
    const wrapper = makeWrapper({ store });
    const expectedPath = ['channel_1', 'topic_1'];
    wrapper.vm.annotatedChildNodes.forEach(n => {
      assert.deepEqual(n.path, expectedPath);
    });
  });

  xit('the correct breadcrumbs appear on the top', () => {
    // TODO create breadcrumb util to convert path -> breadrumbs.items prop
  });

  describe('loading and error states', () => {
    it('shows loading screen when loading', () => {

    });

    it('removes loading screen when loaded', () => {

    });

    it('shows an error state if there was an error loading node', () => {

    });
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
      store.state.pageState.wizardState.path = ['channel_1'];
      store.state.pageState.wizardState.selectedItems.nodes.include = [makeNode('channel_1')];
      const wrapper = makeWrapper({ store });
      assert.equal(checkboxIsChecked(wrapper), true);
    });

    it('if the topic itself is selected, then "Select All" is checked', () => {
      store.state.pageState.wizardState.selectedItems.nodes.include = [makeNode('topic_1')];
      const wrapper = makeWrapper({ store });
      assert.equal(checkboxIsChecked(wrapper), true);
    });

    it('if topic is selected, but one descendant is omitted', () => {
      // ...then "Select All" is unchecked
      store.state.pageState.wizardState.selectedItems.nodes = {
        include: [makeNode('topic_1')],
        omit: [makeNode('subtopic_1', { path: ['topic_1'] })],
      };
      const wrapper = makeWrapper({ store });
      assert.equal(checkboxIsChecked(wrapper), false);
    });
  });

  describe('toggling "select all" checkbox', () => {
    it('if unchecked, clicking the "Select All" for the topic triggers an "add node" action', () => {
      // Selected w/ unselected child scenario
      store.state.pageState.wizardState.selectedItems.nodes = {
        include: [makeNode('topic_1')],
        omit: [makeNode('subtopic_1', { path: ['topic_1'] })],
      };
      const wrapper = makeWrapper({ store });
      const { selectAllCheckbox } = getElements(wrapper);
      const addNodeStub = sinon.stub(wrapper.vm, 'addNodeForTransfer');
      selectAllCheckbox().trigger('click');
      return wrapper.vm.$nextTick()
        .then(() => {
          sinon.assert.calledOnce(addNodeStub);
          sinon.assert.calledWithMatch(addNodeStub, wrapper.vm.annotatedTopicNode);
        });
    });

    it('if topic is checked, clicking the "Select All" for the topic triggers a "remove node" action', () => {
      const topic = makeNode('topic_1');
      store.state.pageState.wizardState.selectedItems.nodes.include = [topic];
      const wrapper = makeWrapper({ store });
      const removeNodeStub = sinon.stub(wrapper.vm, 'removeNodeForTransfer');
      const { selectAllCheckbox } = getElements(wrapper);
      selectAllCheckbox().trigger('click');
      return wrapper.vm.$nextTick()
        .then(() => {
          sinon.assert.calledOnce(removeNodeStub);
          sinon.assert.calledWithMatch(removeNodeStub, wrapper.vm.annotatedTopicNode);
        });
    });
  });

  describe('toggling child node selection', () => {
    it('if a child node is checked, a "remove node" action is triggered', () => {
      const subTopic = makeNode('subtopic_1', { path: ['topic_1'] });
      store.state.pageState.wizardState.treeView.currentNode.children = [subTopic];
      store.state.pageState.wizardState.selectedItems.nodes.include = [subTopic];
      const wrapper = makeWrapper({ store });
      const removeNodeStub = sinon.stub(wrapper.vm, 'removeNodeForTransfer');
      const topicRow = wrapper.first(ContentNodeRow);
      assert.equal(topicRow.getProp('checked'), true);
      topicRow.first('input[type="checkbox"]').trigger('click');
      return wrapper.vm.$nextTick()
        .then(() => {
            sinon.assert.calledOnce(removeNodeStub);
            sinon.assert.calledWithMatch(removeNodeStub, subTopic);
        });
    });

    it('if a child node is unchecked, an "add node" action is triggered', () => {
      const subTopic = makeNode('subtopic_1', { path: ['topic_1'] });
      store.state.pageState.wizardState.treeView.currentNode.children = [subTopic];
      const wrapper = makeWrapper({ store });
      const addNodeStub = sinon.stub(wrapper.vm, 'addNodeForTransfer');
      const topicRow = wrapper.first(ContentNodeRow);
      assert.equal(topicRow.getProp('checked'), false);
      topicRow.first('input[type="checkbox"]').trigger('click');
      return wrapper.vm.$nextTick()
        .then(() => {
            sinon.assert.calledOnce(addNodeStub);
            sinon.assert.calledWithMatch(addNodeStub, subTopic);
        });
    });

    it('if a child node is indeterminate, an "add node" action is triggered', () => {
      const subTopic = makeNode('subtopic', {
        total_resources: 5,
        path: ['channel_1', 'topic_1'],
      });
      const subSubTopic = makeNode('subsubtopic', {
        path: [...subTopic.path, subTopic.pk],
        total_resources: 1
      });
      store.state.pageState.wizardState.path = ['channel_1'];
      store.state.pageState.wizardState.treeView.currentNode.children = [subTopic];
      store.state.pageState.wizardState.selectedItems.nodes = {
        include: [subSubTopic],
        omit: [],
      };
      const wrapper = makeWrapper({ store });
      const addNodeStub = sinon.stub(wrapper.vm, 'addNodeForTransfer');
      const topicRow = wrapper.first(ContentNodeRow);
      assert.equal(topicRow.getProp('checked'), false);
      assert.equal(topicRow.getProp('indeterminate'), true);
      topicRow.first('input[type="checkbox"]').trigger('click');
      return wrapper.vm.$nextTick()
        .then(() => {
            sinon.assert.calledOnce(addNodeStub);
            sinon.assert.calledWithMatch(addNodeStub, subTopic);
        });
    });
  });
});
