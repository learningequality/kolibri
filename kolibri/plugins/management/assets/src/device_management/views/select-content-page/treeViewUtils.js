import find from 'lodash/find';
import sumBy from 'lodash/sumBy';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('treeViewRowMessages', {
  alreadyOnYourDevice: 'Already on your device',
  fractionOfResourcesOnDevice: '{onDevice, number, useGrouping} of {total, number, useGrouping} resources on your device',
  resourcesSelected: '{total, number, useGrouping} {total, plural, one {resource} other {resources}} selected',
  fractionOfResourcesSelected: '{selected, number, useGrouping} of {total, number, useGrouping} {total, plural, one {resource} other {resources}} selected',
});

/**
 * Takes a list of nodes, plus contextual data from store,
 * then annotates them with info needed to correctly display them on tree view.
 *
 * @param nodes {Array<Node>} - The nodes that will be listed on tree view
 * @param selectedNodes
 * @param selectedNodes.omit {Array<Node>}
 * @param selectedNodes.include {Array<Node>}
 * @returns {Array<AnnotatedNode>}
 *
 */
export function annotateNodes(nodes, selectedNodes) {
  return nodes.map(n => annotateNode(n, selectedNodes));
}

/**
 * Logic for annotating different nodes in different situations.
 *
 * @param node {Node}
 * @param selectedNodes {SelectedNodes}
 *
 */
function annotateNode(node, selectedNodes) {
  const { resourcesOnDevice, totalResources } = node;
  const isSelected = find(selectedNodes.include, { id: node.id });

  if (isSelected) {
    const omittedDescendants = selectedNodes.omit.filter(n => n.path.includes(node.id));
    if (omittedDescendants.length > 0) {
      // Selected but with descendant in omit list
      const omittedResources = sumBy(omittedDescendants, 'totalResources');
      return {
        ...node,
        message: translator.$tr('fractionOfResourcesSelected', {
          selected: totalResources - omittedResources,
          total: totalResources,
        }),
        disabled: false,
        checkboxType: 'indeterminate',
      };
    }
    // Completely selected
    return {
      ...node,
      message: translator.$tr('resourcesSelected', { total: totalResources }),
      disabled: false,
      checkboxType: 'checked',
    };
  }

  // Some resources on the device
  if (resourcesOnDevice > 0) {
    if (resourcesOnDevice === totalResources) {
      // Completely on device
      return {
        ...node,
        message: translator.$tr('alreadyOnYourDevice'),
        disabled: true,
        checkboxType: 'checked',
      };
    } else {
      // Partially on device
      return {
        ...node,
        message: translator.$tr('fractionOfResourcesOnDevice', {
          onDevice: resourcesOnDevice,
          total: totalResources,
        }),
        disabled: false,
        checkboxType: 'unchecked',
      };
    }
  }


  const includedDescendants = selectedNodes.include.filter(n => n.path.includes(node.id));

  if (includedDescendants.length > 0) {
    const includedDescendantsResources = sumBy(includedDescendants, 'totalResources');

    // Node is not selected, but has all children selected
    if (includedDescendantsResources === totalResources) {
      return {
        ...node,
        message: translator.$tr('resourcesSelected', { total: totalResources }),
        disabled: false,
        checkboxType: 'checked',
      };
    }

    // Node is not selected, but has some children selected
    return {
      ...node,
      message: translator.$tr('fractionOfResourcesSelected', {
        selected: includedDescendantsResources,
        total: totalResources,
      }),
      disabled: false,
      checkboxType: 'indeterminate',
    }
  }

  // Node is not selected at all, nor has any children, nor is on device
  return {
    ...node,
    message: '',
    disabled: false,
    checkboxType: 'unchecked',
  };

}
