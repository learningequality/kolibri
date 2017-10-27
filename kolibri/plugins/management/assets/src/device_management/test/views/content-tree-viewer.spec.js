/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import { mount } from 'avoriaz';
import sinon from 'sinon';
import ContentTreeViewer from '../../views/select-content-page/content-tree-viewer.vue';
import ContentNodeRow from '../../views/select-content-page/content-node-row.vue';
import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
import { makeNode } from '../utils/data';

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        treeView: {
          currentNode: {
            id: 'topic_1_1',
            path: ['channel_1'],
          },
          path: ['channel_1'],
          children: [
            makeNode('topic_1_1_1', { disabled: false, path: ['channel_1'] }),
            makeNode('resource_1_1_1', { kind: 'video', disabled: false }),
          ],
        },
        selectedItems: {
          nodes: {
            include: [],
            omit: [],
          },
        },
      },
    },
  });
}

function makeWrapper(options = {}) {
  const { props = {}, store } = options
  return mount(ContentTreeViewer, {
    propsData: props,
    store: store || makeStore(),
  });
}

describe.only('', () => {
  it('shows one content-node-row for each node in topic', () => {
    // tests for each row's state are in treeViewUtils and content-node-row spec
    const wrapper = makeWrapper();
    const rows = wrapper.find(ContentNodeRow);
    assert.equal(rows.length, 2);
  });

  it('it shows a special empty state if the topic has no nodes', () => {
    const store = makeStore();
    store.state.pageState.treeView.children = [];
    const wrapper = makeWrapper({ store });
    const contentsSection = wrapper.find('.contents');
    assert.equal(contentsSection[0], undefined);
    const emptyState = wrapper.first('.no-contents');
    assert(emptyState.is('div'));
  });

  it('when clicking a topic-title button on a row, a "go to topic" action is trigged', () => {
    const wrapper = makeWrapper();
    const goToTopicStub = sinon.stub(wrapper.vm, 'goToTopic');
    const rows = wrapper.find(ContentNodeRow);
    rows[0].first('button').trigger('click');
    return wrapper.vm.$nextTick()
    .then(() => {
      sinon.assert.calledOnce(goToTopicStub);
      sinon.assert.calledWith(goToTopicStub, wrapper.vm.annotatedChildNodes[0]);
    });
  });

  describe('Select All checkbox state', () => {
    // Select All's `checked` property is derived by `annotateNode` utility
    it('if any ancestor of the topic is selected, then "Select All" is checked', () => {
      const store = makeStore();
      store.state.pageState.selectedItems.nodes.include = [
        makeNode('channel_1'),
      ];
      const wrapper = makeWrapper({ store });
      const selectAllCheckbox = wrapper.find(kCheckbox)[0];
      // need to confirm this is the select-all checkbox and not one from a content-node-row
      assert.equal(selectAllCheckbox.getProp('label'), 'Select all');
      assert.equal(selectAllCheckbox.getProp('checked'), true);
    });

    it('if the topic itself is selected, then "Select All" is checked', () => {
      const store = makeStore();
      store.state.pageState.selectedItems.nodes.include = [
        makeNode('topic_1_1'),
      ];
      const wrapper = makeWrapper({ store });
      const selectAllCheckbox = wrapper.find(kCheckbox)[0];
      // need to confirm this is the select-all checkbox and not one from a content-node-row
      assert.equal(selectAllCheckbox.getProp('label'), 'Select all');
      assert.equal(selectAllCheckbox.getProp('checked'), true);
    });

    it('if neither topic nor ancestor is selected, then "Select All" is unchecked', () => {
      const wrapper = makeWrapper();
      const selectAllCheckbox = wrapper.find(kCheckbox)[0];
      assert.equal(selectAllCheckbox.getProp('checked'), false);
    });

    it('if topic is selected, but one descendant is omitted, then "Select All" is unchecked', () => {
      const store = makeStore();
      store.state.pageState.selectedItems.nodes = {
        include: [makeNode('topic_1_1')],
        omit: [makeNode('topic_1_1_1', { path: ['topic_1_1'] })],
      };
      const wrapper = makeWrapper({ store });
      const selectAllCheckbox = wrapper.find(kCheckbox)[0];
      assert.equal(selectAllCheckbox.getProp('checked'), false);
    });
  });

  describe('toggling select all checkbox', () => {
    it('if unchecked, clicking the "Select All" for the topic triggers an "add node" action', () => {
      const store = makeStore();
      store.state.pageState.selectedItems.nodes = {
        include: [makeNode('topic_1_1')],
        omit: [makeNode('topic_1_1_1', { path: ['topic_1_1'] })],
      };
      const wrapper = makeWrapper({ store });
      const addNodeStub = sinon.stub(wrapper.vm, 'addNodeForTransfer');
      const selectAllLabel = wrapper.find(kCheckbox)[0];
      // Clicking the entire div, just for fun
      selectAllLabel.trigger('click');
      return wrapper.vm.$nextTick()
      .then(() => {
        sinon.assert.calledOnce(addNodeStub);
        sinon.assert.calledWith(addNodeStub, wrapper.vm.topicNode);
      })
    });

    it('if checked, clicking the "Select All" for the topic triggers a "remove node" action', () => {
      const store = makeStore();
      store.state.pageState.selectedItems.nodes.include = [
        makeNode('topic_1_1'),
      ];
      const wrapper = makeWrapper({ store });
      const removeNodeStub = sinon.stub(wrapper.vm, 'removeNodeForTransfer');
      const selectAllLabel = wrapper.find(kCheckbox)[0];
      selectAllLabel.trigger('click');
      return wrapper.vm.$nextTick()
      .then(() => {
        sinon.assert.calledOnce(removeNodeStub);
        sinon.assert.calledWith(removeNodeStub, wrapper.vm.topicNode);
      })
    });
  });

  it('the correct breadcrumbs appear on the top', () => {
    // TODO create breadcrumb util to convert path -> breadrumbs.items prop
  });
});
