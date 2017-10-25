/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import assert from 'assert';
import { annotateNodes } from '../views/select-content-page/treeViewUtils';
import { makeNode } from './utils/data';

describe('annotateNodes utility correctly annotates', () => {
  it('completely selected nodes', () => {
    const node_1 = makeNode('1');
    const selected = {
      include: [node_1],
      omit: [],
    };
    const annotated = annotateNodes([node_1], selected);
    assert.deepEqual(annotated[0], {
      ...node_1,
      message: '1 resource selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  it('not-selected nodes (in neither list)', () => {
    const node_1 = makeNode('1');
    const selected = { include: [], omit: [] };
    const annotated = annotateNodes([node_1], selected);
    assert.deepEqual(annotated[0], {
      ...node_1,
      message: '',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  it('not-selected nodes (in omit list)', () => {
    const node_1 = makeNode('1');
    const selected = { include: [], omit: [node_1] };
    const annotated = annotateNodes([node_1], selected);
    assert.deepEqual(annotated[0], {
      ...node_1,
      message: '',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  it('nodes that are 100% on device', () => {
    const node_1 = makeNode('1');
    node_1.resourcesOnDevice =  node_1.totalResources = 100;
    const selected = { include: [], omit: [] };
    const annotated = annotateNodes([node_1], selected);
    assert.deepEqual(annotated[0], {
      ...node_1,
      message: 'Already on your device',
      disabled: true,
      checkboxType: 'checked',
    });
  });

  it('nodes that are not selected, but partially on device', () => {
    const node_1 = makeNode('1');
    node_1.totalResources = 2000;
    node_1.resourcesOnDevice = 10;
    const selected = { include: [], omit: [] };
    const annotated = annotateNodes([node_1], selected);
    assert.deepEqual(annotated[0], {
      ...node_1,
      message: '10 of 2,000 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  it('nodes that are omitted, but partially on device', () => {
    const node_1 = makeNode('1');
    node_1.totalResources = 2000;
    node_1.resourcesOnDevice = 10;
    const selected = { include: [], omit: [node_1] };
    const annotated = annotateNodes([node_1], selected);
    assert.deepEqual(annotated[0], {
      ...node_1,
      message: '10 of 2,000 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  // Funky cases
  it('nodes that are partially on device and selected', () => {
    const node_1 = makeNode('1');
    node_1.totalResources = 1;
    node_1.resourcesOnDevice = 0;
    const selected = { include: [node_1], omit: [] };
    const annotated = annotateNodes([node_1], selected);
    assert.deepEqual(annotated[0], {
      ...node_1,
      message: '1 resource selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  it('nodes that are partially selected (node selected, some children de-selected)', () => {
    const includedNode = makeNode('1');
    includedNode.totalResources = 20;
    const omittedNode_1 = makeNode('1_2_1_1', {
      path: ['1', '1_2', '1_2_1'],
      totalResources: 5,
    });
    const omittedNode_2 = makeNode('1_3', {
      path: ['1'],
      totalResources: 3,
    });
    const selected = { include: [includedNode], omit: [omittedNode_1, omittedNode_2] };
    const annotated = annotateNodes([includedNode], selected);
    assert.deepEqual(annotated[0], {
      ...includedNode,
      message: '12 of 20 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
  });

  it('nodes that are partially selected (node not selected, some children in include)', () => {
    const parentNode = makeNode('1', {
      totalResources: 10,
    });
    const childNode_1 = makeNode('1_1', {
      path: ['1'],
      totalResources: 3,
    });
    const childNode_2 = makeNode('1_2', {
      path: ['1'],
      totalResources: 3,
    });
    const selected = { include: [childNode_1, childNode_2], omit: [] };
    const annotated = annotateNodes([parentNode], selected);
    assert.deepEqual(annotated[0], {
      ...parentNode,
      message: '6 of 10 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
  });

  it('nodes with all descendants selected, but the actual root node is not selected', () => {
    const parentNode = makeNode('1', {
      totalResources: 10,
    });
    const childNode_1 = makeNode('1_1', {
      path: ['1'],
      totalResources: 3,
    });
    const childNode_2 = makeNode('1_2', {
      path: ['1'],
      totalResources: 3,
    });
    const childNode_3 = makeNode('1_3', {
      path: ['1'],
      totalResources: 4,
    });
    const selected = { include: [childNode_1, childNode_2, childNode_3], omit: [] };
    const annotated = annotateNodes([parentNode], selected);
    assert.deepEqual(annotated[0], {
      ...parentNode,
      message: '10 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });
});
