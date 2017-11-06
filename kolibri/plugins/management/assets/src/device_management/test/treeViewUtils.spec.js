/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import assert from 'assert';
import { annotateNode, transformBreadrumb } from '../views/select-content-page/treeViewUtils';
import { makeNode } from './utils/data';

describe('annotateNode utility correctly annotates', () => {
  // Simplest cases
  it('nodes that are in the "include" list (100% selected)', () => {
    const node_1 = makeNode('1');
    const selected = {
      include: [node_1],
      omit: [],
    };
    const annotated = annotateNode(node_1, selected);
    assert.deepEqual(annotated, {
      ...node_1,
      message: '1 resource selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  it('nodes that are neither selected nor omitted', () => {
    const node_1 = makeNode('1');
    const selected = { include: [], omit: [] };
    const annotated = annotateNode(node_1, selected);
    assert.deepEqual(annotated, {
      ...node_1,
      message: '',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  it('nodes that are in the "omit list"', () => {
    const node_1 = makeNode('1');
    const selected = { include: [], omit: [node_1] };
    const annotated = annotateNode(node_1, selected);
    assert.deepEqual(annotated, {
      ...node_1,
      message: '',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  // Nodes with resources on the device
  it('nodes that have all resources on the device', () => {
    const node_1 = makeNode('1', {
      total_resources: 100,
      resources_on_device: 100,
    });
    const selected = { include: [], omit: [] };
    const annotated = annotateNode(node_1, selected);
    assert.deepEqual(annotated, {
      ...node_1,
      message: 'Already on your device',
      disabled: true,
      checkboxType: 'checked',
    });
  });

  it('nodes that are not selected, but have some resources on the device', () => {
    const node_1 = makeNode('1', {
      total_resources: 2000,
      resources_on_device: 10,
    });
    const selected = { include: [], omit: [] };
    const annotated = annotateNode(node_1, selected);
    assert.deepEqual(annotated, {
      ...node_1,
      message: '10 of 2,000 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  it('nodes that are in "omit" list, but have some resources on the device', () => {
    const node_1 = makeNode('1', {
      total_resources:  2000,
      resources_on_device:  10,
    });
    const selected = { include: [], omit: [node_1] };
    const annotated = annotateNode(node_1, selected);
    assert.deepEqual(annotated, {
      ...node_1,
      message: '10 of 2,000 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  it('nodes that are in "include" and have some resources on the device', () => {
    // ...are annotated as if included as normal (no special message about resources on device)
    const node_1 = makeNode('1', {
      total_resources: 1,
      resources_on_device: 0,
    });
    const selected = { include: [node_1], omit: [] };
    const annotated = annotateNode(node_1, selected);
    assert.deepEqual(annotated, {
      ...node_1,
      message: '1 resource selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  it('nodes that should be included by ancestor, but have all resources on the device', () => {
    // ...are disabled
    const includedAncestor = makeNode('1');
    const onDeviceDescendant = makeNode('1_1', {
      path: ['1'],
      total_resources: 1,
      resources_on_device: 1
    });
    const selected = { include: [includedAncestor], omit: [] };
    const annotated = annotateNode(onDeviceDescendant, selected);
    assert.deepEqual(annotated, {
      ...onDeviceDescendant,
      message: 'Already on your device',
      disabled: true,
      checkboxType: 'checked',
    });
  });

  // Funky cases
  it('nodes that are not in "include" list, but have ancestors that are', () => {
    // ...are annotated as if they were selected
    const includedAncestor = makeNode('1', { path: ['1'] });
    const notIncludedDescendant = makeNode('1_1_1_1', {
      path: ['1', '1_1', '1_1_1'],
      total_resources: 10,
    });
    const selected = { include: [includedAncestor], omit: [] };
    const annotated = annotateNode(notIncludedDescendant, selected);
    assert.deepEqual(annotated, {
      ...notIncludedDescendant,
      message: '10 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  it('nodes with an ancestor in "include", but have descendants in "omit"', () => {
    // ...are annotated as if they were partially selected
    const includedAncestor = makeNode('1', { path: ['1'] });
    const omittedDescendant = makeNode('1_1_1_1', {
      path: ['1', '1_1', '1_1_1'],
      total_resources: 10,
    });
    const partiallySelected = makeNode('1_1_1', {
      path: ['1', '1_1'],
      total_resources: 20,
    });
    const selected = { include: [includedAncestor], omit: [omittedDescendant] };
    const annotated = annotateNode(partiallySelected, selected);
    assert.deepEqual(annotated, {
      ...partiallySelected,
      message: '10 of 20 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
  });

  it('nodes that are in "include" but have some descendants in "omit"', () => {
    // ...are annotated as if they are partially selected
    const includedNode = makeNode('1', { total_resources: 20 });
    const omittedNode_1 = makeNode('1_2_1_1', {
      path: ['1', '1_2', '1_2_1'],
      total_resources: 5,
    });
    const omittedNode_2 = makeNode('1_3', {
      path: ['1'],
      total_resources: 3,
    });
    const selected = { include: [includedNode], omit: [omittedNode_1, omittedNode_2] };
    const annotated = annotateNode(includedNode, selected);
    assert.deepEqual(annotated, {
      ...includedNode,
      message: '12 of 20 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
  });

  it('nodes that are not in "include" but have some descendants in "include"', () => {
    // ...are annotated as if they are partially selected
    const parentNode = makeNode('1', { total_resources: 10 });
    const childNode_1 = makeNode('1_1', { path: ['1'], total_resources: 3 });
    const childNode_2 = makeNode('1_2', { path: ['1'], total_resources: 3 });
    const selected = { include: [childNode_1, childNode_2], omit: [] };
    const annotated = annotateNode(parentNode, selected);
    assert.deepEqual(annotated, {
      ...parentNode,
      message: '6 of 10 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
  });

  it('nodes that are not in "include" but have all descendants in "include"', () => {
    // ...are annotated as if they are completely selected
    const parentNode = makeNode('1', { total_resources: 10 });
    const childNode_1 = makeNode('1_1', { path: ['1'], total_resources: 3 });
    const childNode_2 = makeNode('1_2', { path: ['1'], total_resources: 3 });
    const childNode_3 = makeNode('1_3', { path: ['1'], total_resources: 4 });
    const selected = { include: [childNode_1, childNode_2, childNode_3], omit: [] };
    const annotated = annotateNode(parentNode, selected);
    assert.deepEqual(annotated, {
      ...parentNode,
      message: '10 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  it('nodes that are in "include" but have all descendants in "omit"', () => {
    // ...are annotated as if they were completely un-selected
    const parentNode = makeNode('1', { total_resources: 10 });
    const childNode_1 = makeNode('1_1', { path: ['1'], total_resources: 3 });
    const childNode_2 = makeNode('1_2', { path: ['1'], total_resources: 3 });
    const childNode_3 = makeNode('1_3', { path: ['1'], total_resources: 4 });
    const selected = { include: [parentNode], omit: [childNode_1, childNode_2, childNode_3] };
    const annotated = annotateNode(parentNode, selected);
    assert.deepEqual(annotated, {
      ...parentNode,
      message: '',
      disabled: false,
      checkboxType: 'unchecked',
    });

  });
});

describe('transformBreadrumb utility', () => {
  it('it converts the breadcrumb correctly', () => {
    const crumb = {
      id: 'channel_1',
      title: 'Channel Supremo',
    };
    assert.deepEqual(transformBreadrumb(crumb), {
      text: 'Channel Supremo',
      link: {
        name: 'wizardtransition',
        params: {
          transition: 'treeview_update_topic',
          id: 'channel_1',
          title: 'Channel Supremo',
        },
      },
    });
  });
});
