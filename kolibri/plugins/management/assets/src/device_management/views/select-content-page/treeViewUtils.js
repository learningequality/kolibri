import find from 'lodash/find';
import sumBy from 'lodash/sumBy';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('treeViewRowMessages', {
  alreadyOnYourDevice: 'Already on your device',
  fractionOfResourcesOnDevice: '{onDevice, number, useGrouping} of {total, number, useGrouping} resources on your device',
  resourcesSelected: '{total, number, useGrouping} {total, plural, one {resource} other {resources}} selected',
  fractionOfResourcesSelected: '{selected, number, useGrouping} of {total, number, useGrouping} {total, plural, one {resource} other {resources}} selected',
});

const CheckboxTypes = {
  CHECKED: 'checked',
  UNCHECKED: 'unchecked',
  INDETERMINATE: 'indeterminate',
};

/**
 * Takes a nodes, plus contextual data from store,
 * then annotates them with info needed to correctly display it on tree view.
 *
 * @param node {Node}
 * @param selectedNodes {SelectedNodes}
 * @param selectedNodes.omit {Array<Node>}
 * @param selectedNodes.include {Array<Node>}
 * @returns {Array<AnnotatedNode>}
 *
 */
export function annotateNode(node, selectedNodes) {
  const { resourcesOnDevice, totalResources } = node;
  const isSelected = find(selectedNodes.include, { id: node.id });
  const ancestorIsSelected = find(selectedNodes.include, n => node.path.includes(n.id));

  if (isSelected || ancestorIsSelected) {
    const omittedDescendants = selectedNodes.omit.filter(n => n.path.includes(node.id));

    // Selected but with some or all descendants in omit list
    if (omittedDescendants.length > 0) {
      const omittedResources = sumBy(omittedDescendants, 'totalResources');

      // All descendants are omitted
      if (omittedResources === totalResources) {
        return {
          ...node,
          message: '',
          disabled: false,
          checkboxType: CheckboxTypes.UNCHECKED,
        };
      }

      // Not all descendants are omitted
      return {
        ...node,
        message: translator.$tr('fractionOfResourcesSelected', {
          selected: totalResources - omittedResources,
          total: totalResources,
        }),
        disabled: false,
        checkboxType: CheckboxTypes.INDETERMINATE,
      };
    }
    // Completely selected
    return {
      ...node,
      message: translator.$tr('resourcesSelected', { total: totalResources }),
      disabled: false,
      checkboxType: CheckboxTypes.CHECKED,
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
        checkboxType: CheckboxTypes.CHECKED,
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
        checkboxType: CheckboxTypes.UNCHECKED,
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
        checkboxType: CheckboxTypes.CHECKED,
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
      checkboxType: CheckboxTypes.INDETERMINATE,
    }
  }

  // Node is not selected at all, nor has any children, nor is on device
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
export function transformBreadrumb({ title, id }) {
  return {
    text: title,
    link: {
      name: 'wizardtransition',
      params: {
        transition: 'treeview_go_to_topic',
        id,
        title,
      },
    },
  };
}
