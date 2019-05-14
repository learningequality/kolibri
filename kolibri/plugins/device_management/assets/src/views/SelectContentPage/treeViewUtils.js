import find from 'lodash/find';
import flip from 'lodash/flip';
import partial from 'lodash/partial';
import sumBy from 'lodash/fp/sumBy';
import { createTranslator } from 'kolibri.utils.i18n';
import { selectContentTopicLink } from '../ManageContentPage/manageContentLinks';
import { calculateApproximateCounts } from './../../modules/wizard/utils';

const translator = createTranslator('TreeViewRowMessages', {
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
const sumImportableResources = sumBy(o => o.importable_resources || 0);
const sumOnDeviceResources = sumBy(o => o.on_device_resources || 0);

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
export function annotateNode(node, selectedNodes, forImport = true, channel) {
  const on_device_resources = node.on_device_resources || 0;
  const importable_resources = node.importable_resources || 0;
  const isIncluded = find(selectedNodes.included, { id: node.id });
  const isOmitted = find(selectedNodes.omitted, { id: node.id });
  const ancestorIsIncluded = find(selectedNodes.included, iNode => isAncestorOf(iNode, node));
  const ancestorIsOmitted = find(selectedNodes.omitted, oNode => isAncestorOf(oNode, node));
  const nodeIsIncluded = isIncluded || ancestorIsIncluded;
  const nodeSelected = !(isOmitted || ancestorIsOmitted) && nodeIsIncluded;
  const totalResources = on_device_resources + importable_resources;
  // A ratio of the number of duped resources compared to deduped resources.
  // For most channels this will be 1, but for e.g. Khan Academy English,
  // this can be greater than 2.
  const duplicateResources = forImport
    ? channel.importable_resource_duplication
    : channel.total_resource_duplication;

  const approximateCounts = partial(calculateApproximateCounts, duplicateResources);
  // Completely on device -> DISABLED
  if (totalResources === on_device_resources) {
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
        message: nodeSelected
          ? translator.$tr('resourcesSelected', {
              total: approximateCounts(forImport ? totalResources : on_device_resources),
            })
          : '',
        disabled: false,
        checkboxType: nodeSelected ? CheckboxTypes.CHECKED : CheckboxTypes.UNCHECKED,
      };
    }
  }

  if (nodeSelected) {
    const omittedDescendants = selectedNodes.omitted.filter(oNode => isDescedantOf(oNode, node));

    // If any descendants are omitted -> UNCHECKED or INDETERMINATE
    if (omittedDescendants.length > 0) {
      const omittedResources = sumImportableResources(omittedDescendants) || 0;

      // All descendants are omitted -> UNCHECKED
      if (omittedResources === importable_resources) {
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
        selectedCount =
          importable_resources - sumImportableResources(omittedDescendants) + on_device_resources;
        totalCount = totalResources;
      } else {
        selectedCount = on_device_resources - sumOnDeviceResources(omittedDescendants);
        totalCount = on_device_resources;
      }
      return {
        ...node,
        message: translator.$tr('fractionOfResourcesSelected', {
          selected: approximateCounts(selectedCount),
          total: approximateCounts(totalCount),
        }),
        disabled: false,
        checkboxType: CheckboxTypes.INDETERMINATE,
      };
    }

    // Completely selected -> CHECKED
    return {
      ...node,
      message: translator.$tr('resourcesSelected', {
        total: approximateCounts(forImport ? totalResources : on_device_resources),
      }),
      disabled: false,
      checkboxType: CheckboxTypes.CHECKED,
    };
  }

  const fullyIncludedDescendants = selectedNodes.included
    .filter(iNode => isDescedantOf(iNode, node))
    .filter(iNode => !selectedNodes.omitted.find(oNode => isDescedantOf(oNode, iNode)));

  if (fullyIncludedDescendants.length > 0) {
    const fullyImportable = sumImportableResources(fullyIncludedDescendants);
    const fullyOnDevice = sumOnDeviceResources(fullyIncludedDescendants);

    // Node is not selected, has all children selected -> CHECKED
    if (forImport) {
      if (fullyImportable === importable_resources) {
        return {
          ...node,
          message: translator.$tr('resourcesSelected', {
            total: approximateCounts(totalResources),
          }),
          disabled: false,
          checkboxType: CheckboxTypes.CHECKED,
        };
      }
      // Node is not selected, has some children selected -> INDETERMINATE
      return {
        ...node,
        message: translator.$tr('fractionOfResourcesSelected', {
          selected: approximateCounts(fullyImportable + fullyOnDevice),
          total: approximateCounts(totalResources),
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
            selected: approximateCounts(fullyOnDevice),
            total: approximateCounts(on_device_resources),
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
    if (forImport) {
      return {
        ...node,
        message: translator.$tr('fractionOfResourcesOnDevice', {
          onDevice: approximateCounts(on_device_resources),
          total: approximateCounts(totalResources),
        }),
        disabled: false,
        checkboxType: CheckboxTypes.UNCHECKED,
      };
    } else {
      return {
        ...node,
        message: nodeIsIncluded
          ? translator.$tr('resourcesSelected', {
              total: approximateCounts(on_device_resources),
            })
          : '',
        disabled: false,
        checkboxType: nodeIsIncluded ? CheckboxTypes.CHECKED : CheckboxTypes.UNCHECKED,
      };
    }
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
export function transformBreadrumb(node, query) {
  return {
    text: node.title || translator.$tr('noTitle'),
    link: selectContentTopicLink(node, query),
  };
}
