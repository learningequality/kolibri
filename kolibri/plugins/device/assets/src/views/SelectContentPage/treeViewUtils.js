import find from 'lodash/find';
import flip from 'lodash/flip';
import sumBy from 'lodash/fp/sumBy';
import { createTranslator } from 'kolibri.utils.i18n';
import { selectContentTopicLink } from '../ManageContentPage/manageContentLinks';

const translator = createTranslator('TreeViewRowMessages', {
  alreadyOnYourDevice: 'Already on your device',
  fractionOfResourcesOnDevice:
    '{onDevice, number, useGrouping} of {total, number, useGrouping} resources on your device',
  resourcesSelected:
    '{total, number, useGrouping} {total, plural, one {resource} other {resources}} selected',
  fractionOfResourcesSelected:
    '{selected, number, useGrouping} of {total, number, useGrouping} {total, plural, one {resource} other {resources}} selected',
  noTitle: 'No title',
  someResourcesSelected: 'Some resources selected',
  someResourcesOnDevice: 'Some resources on this device',
  allResourcesSelected: 'All resources selected',
  allResourcesOnDevice: 'All resources on this device',
});

export const CheckboxTypes = {
  CHECKED: 'checked',
  UNCHECKED: 'unchecked',
  INDETERMINATE: 'indeterminate',
};

// One-liner utilities for annotateNode
// isAncestorOf(a, b) is truthy if a is an ancestor of b
const isAncestorOf = (a, b) => find(b.path, { id: a.id });
const isDescedantOf = flip(isAncestorOf);
const sumTotalResources = sumBy('total_resources');
const sumOnDeviceResources = sumBy('on_device_resources');

// Props shared with all partially-selected nodes
function partiallySelectedNode(node) {
  return {
    ...node,
    message: translator.$tr('someResourcesSelected'),
    disabled: false,
    checkboxType: CheckboxTypes.INDETERMINATE,
  };
}

// Props shared with all fully-selected nodes
function fullySelectedNode(node) {
  return {
    ...node,
    message: translator.$tr('allResourcesSelected'),
    disabled: false,
    checkboxType: CheckboxTypes.CHECKED,
  };
}

// Props shared with all unselected nodes
function unselectedNode(node) {
  return {
    ...node,
    message: '',
    disabled: false,
    checkboxType: CheckboxTypes.UNCHECKED,
  };
}

/**
 * Takes a Node, plus contextual data from store, then annotates them with info
 * needed to correctly display it on tree view.
 *
 * @param node {Node}
 * @param selectedNodes {SelectedNodes}
 * @param selectedNodes.omitted {Array<Node>}
 * @param selectedNodes.included {Array<Node>}
 * @returns {AnnotatedNode} - annotations are message, disabled, and checkboxType
 *
 */
export function annotateNode(node, selectedNodes, forImport = true) {
  const { on_device_resources, total_resources } = node;
  const isIncluded = find(selectedNodes.included, { id: node.id });
  const isOmitted = find(selectedNodes.omitted, { id: node.id });
  const ancestorIsIncluded = find(selectedNodes.included, iNode => isAncestorOf(iNode, node));
  const ancestorIsOmitted = find(selectedNodes.omitted, oNode => isAncestorOf(oNode, node));
  const nodeIsIncluded = isIncluded || ancestorIsIncluded;

  // Completely on device -> DISABLED
  if (forImport && on_device_resources === total_resources) {
    return {
      ...fullySelectedNode(node),
      disabled: true,
      message: translator.$tr('alreadyOnYourDevice'),
    };
  }

  // HACK Special case that got left out: node is included but has
  // omitted descendants -> INDETERMINATE (for both import and manage modes)
  const omittedDescendants = selectedNodes.omitted.filter(oNode => isDescedantOf(oNode, node));

  if (!nodeIsIncluded && omittedDescendants.length > 0) {
    return partiallySelectedNode(node);
  }

  if (!(isOmitted || ancestorIsOmitted) && nodeIsIncluded) {
    // If any descendants are omitted -> UNCHECKED or INDETERMINATE
    if (omittedDescendants.length > 0) {
      // All descendants are omitted -> UNCHECKED
      let allDescendantsOmitted = false;
      if (forImport) {
        allDescendantsOmitted =
          (sumTotalResources(omittedDescendants) || 0) -
            (sumOnDeviceResources(omittedDescendants) || 0) ===
          total_resources - on_device_resources;
      } else {
        allDescendantsOmitted =
          (sumOnDeviceResources(omittedDescendants) || 0) === on_device_resources;
      }

      if (allDescendantsOmitted) {
        return unselectedNode(node);
      }

      // Some (but not all) descendants are omitted -> INDETERMINATE
      return partiallySelectedNode(node);
    }

    // Completely selected -> CHECKED
    return fullySelectedNode(node);
  }

  const fullyIncludedDescendants = selectedNodes.included
    .filter(iNode => isDescedantOf(iNode, node))
    .filter(iNode => !selectedNodes.omitted.find(oNode => isDescedantOf(oNode, iNode)));

  if (fullyIncludedDescendants.length > 0) {
    const fullyTotal = sumTotalResources(fullyIncludedDescendants);
    const fullyOnDevice = sumOnDeviceResources(fullyIncludedDescendants);

    // Node is not selected, has all children selected -> CHECKED
    if (forImport) {
      if (fullyTotal - fullyOnDevice === total_resources - on_device_resources) {
        return fullySelectedNode(node);
      } else {
        // Node is not selected, has some children selected -> INDETERMINATE
        return partiallySelectedNode(node);
      }
    } else {
      if (fullyOnDevice === on_device_resources) {
        return fullySelectedNode(node);
      } else {
        return partiallySelectedNode(node);
      }
    }
  }

  if (forImport && on_device_resources > 0) {
    // Node has some (but not all) resources on device -> UNCHECKED (w/ message).
    // Node with all resources on device handled at top of this function.
    return {
      ...unselectedNode(node),
      message: translator.$tr('fractionOfResourcesOnDevice', {
        onDevice: on_device_resources,
        total: total_resources,
      }),
    };
  }

  // Node is not selected, has no children, is not on device -> UNCHECKED
  return unselectedNode(node);
}

/**
 * Takes an array of breadcrumb { id, title } objects in state, and converts them
 * into a form that can be used in k-breadcrumbs props.items { text, link: LinkObject }.
 *
 */
export function transformBreadrumb(node, { query, params }) {
  return {
    text: node.title || translator.$tr('noTitle'),
    link: selectContentTopicLink(node, query, params.channel_id),
  };
}
