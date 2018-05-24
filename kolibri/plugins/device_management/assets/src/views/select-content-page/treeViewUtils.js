import find from 'lodash/find';
import flip from 'lodash/flip';
import sumBy from 'lodash/fp/sumBy';
import { createTranslator } from 'kolibri.utils.i18n';
import { selectContentTopicLink } from '../manage-content-page/manageContentLinks';

const translator = createTranslator('treeViewRowMessages', {
  alreadyOnYourDevice: 'Already on your device',
  fractionOfResourcesOnDevice:
    '{onDevice, number, useGrouping} of {total, number, useGrouping} resources on your device',
  resourcesSelected:
    '{total, number, useGrouping} {total, plural, one {resource} other {resources}} selected',
  fractionOfResourcesSelected:
    '{selected, number, useGrouping} of {total, number, useGrouping} {total, plural, one {resource} other {resources}} selected',
  noTitle: 'No title',
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
  if (on_device_resources === total_resources) {
    if (forImport) {
      return {
        ...node,
        message: translator.$tr('alreadyOnYourDevice'),
        disabled: true,
        checkboxType: CheckboxTypes.CHECKED,
      };
    } else {
      return {
        ...node,
        message: '',
        disabled: false,
        checkboxType: nodeIsIncluded ? CheckboxTypes.CHECKED : CheckboxTypes.UNCHECKED,
      };
    }
  }

  if (!(isOmitted || ancestorIsOmitted) && nodeIsIncluded) {
    const omittedDescendants = selectedNodes.omitted.filter(oNode => isDescedantOf(oNode, node));

    // If any descendants are omitted -> UNCHECKED or INDETERMINATE
    if (omittedDescendants.length > 0) {
      const omittedResources =
        (sumTotalResources(omittedDescendants) || 0) -
        (sumOnDeviceResources(omittedDescendants) || 0);

      // All descendants are omitted -> UNCHECKED
      if (omittedResources === total_resources - on_device_resources) {
        return {
          ...node,
          message: '',
          disabled: false,
          checkboxType: CheckboxTypes.UNCHECKED,
        };
      }

      // Some (but not all) descendants are omitted -> INDETERMINATE
      let selectedCount;
      let totalCount;
      if (forImport) {
        selectedCount = total_resources - sumTotalResources(omittedDescendants);
        totalCount = total_resources;
      } else {
        selectedCount = on_device_resources - sumOnDeviceResources(omittedDescendants);
        totalCount = on_device_resources;
      }
      return {
        ...node,
        message: translator.$tr('fractionOfResourcesSelected', {
          selected: selectedCount,
          total: totalCount,
        }),
        disabled: false,
        checkboxType: CheckboxTypes.INDETERMINATE,
      };
    }

    // Completely selected -> CHECKED
    return {
      ...node,
      message: translator.$tr('resourcesSelected', {
        total: forImport ? total_resources : on_device_resources,
      }),
      disabled: false,
      checkboxType: CheckboxTypes.CHECKED,
    };
  }

  const fullyIncludedDescendants = selectedNodes.included
    .filter(iNode => isDescedantOf(iNode, node))
    .filter(iNode => !selectedNodes.omitted.find(oNode => isDescedantOf(oNode, iNode)));

  if (fullyIncludedDescendants.length > 0) {
    const fullyTotal = sumTotalResources(fullyIncludedDescendants);
    const fullyOnDevice = sumOnDeviceResources(fullyIncludedDescendants);

    // Node is not selected, has all children selected -> CHECKED
    if (forImport) {
      if (fullyTotal === total_resources) {
        return {
          ...node,
          message: translator.$tr('resourcesSelected', { total: total_resources }),
          disabled: false,
          checkboxType: CheckboxTypes.CHECKED,
        };
      }
      // Node is not selected, has some children selected -> INDETERMINATE
      return {
        ...node,
        message: translator.$tr('fractionOfResourcesSelected', {
          selected: fullyTotal,
          total: total_resources,
        }),
        disabled: false,
        checkboxType: CheckboxTypes.INDETERMINATE,
      };
    } else {
      if (fullyOnDevice === on_device_resources) {
        return {
          ...node,
          message: translator.$tr('resourcesSelected', { total: on_device_resources }),
          disabled: false,
          checkboxType: CheckboxTypes.CHECKED,
        };
      } else {
        return {
          ...node,
          message: translator.$tr('fractionOfResourcesSelected', {
            selected: fullyOnDevice,
            total: on_device_resources,
          }),
          disabled: false,
          checkboxType: CheckboxTypes.INDETERMINATE,
        };
      }
    }
  }

  if (on_device_resources > 0) {
    // Node has some (but not all) resources on device -> UNCHECKED (w/ message).
    // Node with all resources on device handled at top of this function.
    return {
      ...node,
      message: translator.$tr('fractionOfResourcesOnDevice', {
        onDevice: on_device_resources,
        total: total_resources,
      }),
      disabled: false,
      checkboxType: CheckboxTypes.UNCHECKED,
    };
  }

  // Node is not selected, has no children, is not on device -> UNCHECKED
  return {
    ...node,
    message: '',
    disabled: false,
    checkboxType: CheckboxTypes.UNCHECKED,
  };
}

/**
 * Takes an array of breadcrumb { id, title } objects in state, and converts them
 * into a form that can be used in k-breadcrumbs props.items { text, link: LinkObject }.
 *
 */
export function transformBreadrumb(node) {
  return {
    text: node.title || translator.$tr('noTitle'),
    link: selectContentTopicLink(node),
  };
}
