/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import { addNodeForTransfer, removeNodeForTransfer } from '../../state/actions/contentTransferActions';
import * as mutations from '../../state/mutations/contentTransferMutations';
import { makeNode } from '../utils/data';
import { selectedNodes } from '../../state/getters';

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        selectedItems: {
          total_resource_count: 0,
          total_file_size: 0,
          nodes: {
            include: [],
            omit: [],
          },
        },
      },
    },
    mutations,
  });
}

function includeList(store) {
  return selectedNodes(store.state).include;
}

function omitList(store) {
  return selectedNodes(store.state).omit;
}

function nodeCounts(store) {
  return {
    files: store.state.pageState.selectedItems.total_file_size,
    resources: store.state.pageState.selectedItems.total_resource_count,
  };
}

describe('content transfer actions', () => {
  describe('adding nodes', () => {
    it('adding a single node to empty list', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      addNodeForTransfer(store, node_1);
      assert.deepEqual(includeList(store), [node_1]);
      assert.deepEqual(nodeCounts(store), {
        files: 1,
        resources: 1,
      });
    });

    it('adding nodes that are not parent/child to each other', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      const node_2 = makeNode('1_2_1', { path: ['1', '1_2'] });
      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      assert.deepEqual(includeList(store), [node_1, node_2]);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 2,
        resources: 2,
      });
    });

    it('nodes that are made redundant be new node are removed', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      // this makes node_1 redundant
      const node_2 = makeNode('1_1', {
        path: ['1'],
        totalResources: 3,
        fileSize: 3,
      });

      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      assert.deepEqual(includeList(store), [node_2]);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 3,
        resources: 3,
      });
    });

    it('adding root of the content tree', () => {
      const store = makeStore();
      // the entire channel
      const node_0 = makeNode('1', {
        fileSize: 100,
        totalResources: 100,
      });
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      const node_2 = makeNode('1_2_1', { path: ['1', '1_2'] });
      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      addNodeForTransfer(store, node_0); // makes the first two additions redundant
      assert.deepEqual(includeList(store), [node_0]);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 100,
        resources: 100,
      });
    });

    it('adding a node removes it from omit list', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1', {
        path: ['1'],
        totalResources: 5,
        fileSize: 5,
      });
      const node_2 = makeNode('1_1_1', { path: ['1', '1_1'] });
      addNodeForTransfer(store, node_1);
      removeNodeForTransfer(store, node_2);
      // removing the parent node first, implicitly deselecting node_2
      removeNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      assert.deepEqual(includeList(store), [node_2]);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 1,
        resources: 1,
      });
    });
  });

  describe('removing nodes', () => {
    it('removing a single node', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      addNodeForTransfer(store, node_1);
      removeNodeForTransfer(store, node_1);
      assert.deepEqual(includeList(store), []);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 0,
        resources: 0,
      });
    });

    it('removing a node that is a child of an included node', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1', {
        path: ['1'],
        totalResources: 50,
        fileSize: 50,
      });
      const node_2 = makeNode('1_1_1', {
        path: ['1', '1_1'],
        totalResources: 20,
        fileSize: 20,
      });
      addNodeForTransfer(store, node_1);
      removeNodeForTransfer(store, node_2); // removes a child of node_1
      assert.deepEqual(includeList(store), [node_1]);
      assert.deepEqual(omitList(store), [node_2]);
      assert.deepEqual(nodeCounts(store), {
        files: 30,
        resources: 30,
      });
    });

    it('removing a sibling is same as removing single node', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1', { path: ['1'] });
      const node_2 = makeNode('1_2', { path: ['1'] });
      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      removeNodeForTransfer(store, node_2);
      assert.deepEqual(includeList(store), [node_1]);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 1,
        resources: 1,
      });
    });

    it('removing root of content tree when some children are selected', () => {
      const store = makeStore();
      const node_0 = makeNode('1');
      const node_1 = makeNode('1_1', { path: ['1'] });
      const node_2 = makeNode('1_2', { path: ['1'] });
      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      // in UI, user will toggle the channel checkbox once, selecting all of it
      addNodeForTransfer(store, node_0);
      // then click it again to deselect...
      removeNodeForTransfer(store, node_0);
      assert.deepEqual(includeList(store), []);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 0,
        resources: 0,
      });
    });
  });
});
