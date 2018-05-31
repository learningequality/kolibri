/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import pick from 'lodash/pick';
import { annotateNode } from '../src/views/select-content-page/treeViewUtils';
import { makeNode } from './utils/data';

function simplePath(ids) {
  return ids.map(makeNode);
}

function assertAnnotationsEqual(annotated, expected) {
  expect(pick(annotated, ['message', 'disabled', 'checkboxType'])).to.deep.equal(expected);
}

function makeNodeWithResources(id, total = 1, onDevice = 0) {
  return makeNode(id, { total_resources: total, on_device_resources: onDevice });
}

function makeNodesForTransfer(included, omitted) {
  return { included, omitted };
}

describe('annotateNode utility correctly annotates', () => {
  // Simplest cases
  it('nodes that are in the "include" list (100% selected)', () => {
    const node_1 = makeNodeWithResources('1', 100, 10);
    const selected = makeNodesForTransfer([node_1], []);
    const annotated = annotateNode(node_1, selected);
    const exportAnnotated = annotateNode(node_1, selected, false);
    assertAnnotationsEqual(annotated, {
      message: '100 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
    assertAnnotationsEqual(exportAnnotated, {
      message: '10 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  it('nodes that are neither selected nor omitted', () => {
    const node_1 = makeNodeWithResources('1', 100, 10);
    const selected = makeNodesForTransfer([], []);
    const annotated = annotateNode(node_1, selected);
    const exportAnnotated = annotateNode(node_1, selected, false);
    assertAnnotationsEqual(annotated, {
      message: '10 of 100 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
    assertAnnotationsEqual(exportAnnotated, {
      message: '10 of 100 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  it('nodes that are in the "omit list"', () => {
    const node_1 = makeNodeWithResources('1', 100, 10);
    const selected = makeNodesForTransfer([], [node_1]);
    const annotated = annotateNode(node_1, selected);
    const exportAnnotated = annotateNode(node_1, selected, false);
    assertAnnotationsEqual(annotated, {
      message: '10 of 100 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
    assertAnnotationsEqual(exportAnnotated, {
      message: '10 of 100 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  // Nodes with resources on the device
  it('nodes that have all resources on the device', () => {
    const node_1 = makeNodeWithResources('1', 100, 100);
    const selected = makeNodesForTransfer([], []);
    const annotated = annotateNode(node_1, selected);
    const exportAnnotated = annotateNode(node_1, selected, false);
    assertAnnotationsEqual(annotated, {
      message: 'Already on your device',
      disabled: true,
      checkboxType: 'checked',
    });
    assertAnnotationsEqual(exportAnnotated, {
      message: '',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  it('nodes that are not selected, but have some resources on the device', () => {
    const node_1 = makeNodeWithResources('1', 2000, 10);
    const selected = makeNodesForTransfer([], []);
    const annotated = annotateNode(node_1, selected);
    const exportAnnotated = annotateNode(node_1, selected, false);
    assertAnnotationsEqual(annotated, {
      message: '10 of 2,000 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
    assertAnnotationsEqual(exportAnnotated, {
      message: '10 of 2,000 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  it('nodes that are in "omit" list, but have some resources on the device', () => {
    const node_1 = makeNodeWithResources('1', 2000, 10);
    const selected = makeNodesForTransfer([], [node_1]);
    const annotated = annotateNode(node_1, selected);
    const exportAnnotated = annotateNode(node_1, selected, false);
    assertAnnotationsEqual(annotated, {
      message: '10 of 2,000 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
    assertAnnotationsEqual(exportAnnotated, {
      message: '10 of 2,000 resources on your device',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });

  it('nodes that are in "include" and have some resources on the device', () => {
    // ...are annotated as if included as normal (no special message about resources on device)
    const node_1 = makeNodeWithResources('1', 100, 10);
    const selected = makeNodesForTransfer([node_1], []);
    const annotated = annotateNode(node_1, selected);
    const exportAnnotated = annotateNode(node_1, selected, false);
    assertAnnotationsEqual(annotated, {
      message: '100 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
    assertAnnotationsEqual(exportAnnotated, {
      message: '10 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  it('nodes that are proxy-included by ancestor, but have all resources on the device', () => {
    // ...are disabled
    const includedAncestor = makeNodeWithResources('1', 50, 20);
    const onDeviceDescendant = {
      ...makeNodeWithResources('1_1', 1, 1),
      path: simplePath(['1']),
    };
    const selected = makeNodesForTransfer([includedAncestor], []);
    const annotated = annotateNode(onDeviceDescendant, selected);
    const exportAnnotated = annotateNode(onDeviceDescendant, selected, false);
    assertAnnotationsEqual(annotated, {
      message: 'Already on your device',
      disabled: true,
      checkboxType: 'checked',
    });
    assertAnnotationsEqual(exportAnnotated, {
      message: '',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  // Funky cases
  it('nodes that are not in "include" list, but have ancestors that are', () => {
    // ...are annotated as if they were selected
    const includedAncestor = makeNode('1', {
      path: simplePath(['1']),
      total_resources: 20,
      on_device_resources: 10,
    });
    const notIncludedDescendant = makeNode('1_1_1_1', {
      path: simplePath(['1', '1_1', '1_1_1']),
      on_device_resources: 5,
      total_resources: 10,
    });
    const selected = makeNodesForTransfer([includedAncestor], []);
    const annotated = annotateNode(notIncludedDescendant, selected);
    const exportAnnotated = annotateNode(notIncludedDescendant, selected, false);
    assertAnnotationsEqual(annotated, {
      message: '10 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
    assertAnnotationsEqual(exportAnnotated, {
      message: '5 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  it('nodes with an ancestor in "include", but have descendants in "omit"', () => {
    // ...are annotated as if they were partially selected
    // All descendants except the omitted one will be imported
    const includedAncestor = makeNode('1', {
      path: simplePath(['1']),
      total_resources: 20,
      on_device_resources: 10,
    });
    const omittedDescendant = {
      ...makeNodeWithResources('1_1_1_1', 10, 2),
      path: simplePath(['1', '1_1', '1_1_1']),
    };
    const partiallySelected = {
      ...makeNodeWithResources('1_1_1', 20, 3),
      path: simplePath(['1', '1_1']),
    };
    const selected = makeNodesForTransfer([includedAncestor], [omittedDescendant]);
    const annotated = annotateNode(partiallySelected, selected);
    const exportAnnotated = annotateNode(partiallySelected, selected, false);
    assertAnnotationsEqual(annotated, {
      message: '10 of 20 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
    assertAnnotationsEqual(exportAnnotated, {
      message: '1 of 3 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
  });

  it('nodes that are in "include" but have some descendants in "omit"', () => {
    // ...are annotated as if they are partially selected
    // Here, 20 - 8 = 12 resoures will be staged for import
    const includedNode = makeNodeWithResources('1', 20, 5);
    const omittedNode_1 = {
      ...makeNodeWithResources('1_2_1_1', 5, 1),
      path: simplePath(['1', '1_2', '1_2_1']),
    };
    const omittedNode_2 = {
      ...makeNodeWithResources('1_3', 3, 1),
      path: simplePath(['1']),
    };
    const selected = makeNodesForTransfer([includedNode], [omittedNode_1, omittedNode_2]);
    const annotated = annotateNode(includedNode, selected);
    assertAnnotationsEqual(annotated, {
      message: '12 of 20 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
    const exportAnnotated = annotateNode(includedNode, selected, false);
    assertAnnotationsEqual(exportAnnotated, {
      message: '3 of 5 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
  });

  it('nodes that are not in "include" but have some descendants in "include"', () => {
    // ...are annotated as if they are partially selected
    const parentNode = makeNodeWithResources('1', 10, 3);
    const childNode_1 = {
      ...makeNodeWithResources('1_1', 3, 1),
      path: simplePath(['1']),
    };
    const childNode_2 = {
      ...makeNodeWithResources('1_2', 3, 1),
      path: simplePath(['1']),
    };
    const selected = makeNodesForTransfer([childNode_1, childNode_2], []);
    const annotated = annotateNode(parentNode, selected);
    // Here, assumption is all descendants of included nodes will be imported
    assertAnnotationsEqual(annotated, {
      message: '6 of 10 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
    const exportAnnotated = annotateNode(parentNode, selected, false);
    assertAnnotationsEqual(exportAnnotated, {
      message: '2 of 3 resources selected',
      disabled: false,
      checkboxType: 'indeterminate',
    });
  });

  it('nodes that are not in "include" but have all descendants in "include"', () => {
    // ...are annotated as if they are completely selected
    const parentNode = makeNodeWithResources('1', 10, 3);
    const childNode_1 = {
      ...makeNodeWithResources('1_1', 3, 1),
      path: simplePath(['1']),
    };
    const childNode_2 = {
      ...makeNodeWithResources('1_2', 3, 1),
      path: simplePath(['1']),
    };
    const childNode_3 = {
      ...makeNodeWithResources('1_3', 4, 1),
      path: simplePath(['1']),
    };
    const selected = makeNodesForTransfer([childNode_1, childNode_2, childNode_3], []);
    const annotated = annotateNode(parentNode, selected);
    // Technically not correct, but implication is that they are completing the parentNode.
    // Will really only be transfering 7 resources.
    assertAnnotationsEqual(annotated, {
      message: '10 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
    const exportAnnotated = annotateNode(parentNode, selected, false);
    assertAnnotationsEqual(exportAnnotated, {
      message: '3 resources selected',
      disabled: false,
      checkboxType: 'checked',
    });
  });

  it('nodes that are in "include" but have all descendants in "omit"', () => {
    // ...are annotated as if they were completely un-selected
    const parentNode = makeNodeWithResources('1', 10, 3);
    const childNode_1 = {
      ...makeNodeWithResources('1_1', 3, 1),
      path: simplePath(['1']),
    };
    const childNode_2 = {
      ...makeNodeWithResources('1_2', 3, 1),
      path: simplePath(['1']),
    };
    const childNode_3 = {
      ...makeNodeWithResources('1_3', 4, 1),
      path: simplePath(['1']),
    };
    const selected = makeNodesForTransfer([parentNode], [childNode_1, childNode_2, childNode_3]);
    const annotated = annotateNode(parentNode, selected);
    assertAnnotationsEqual(annotated, {
      message: '',
      disabled: false,
      checkboxType: 'unchecked',
    });
    const exportAnnotated = annotateNode(parentNode, selected, false);
    assertAnnotationsEqual(exportAnnotated, {
      message: '',
      disabled: false,
      checkboxType: 'unchecked',
    });
  });
});
