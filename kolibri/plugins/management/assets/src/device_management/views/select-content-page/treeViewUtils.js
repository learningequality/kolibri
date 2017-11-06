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
  const { resources_on_device, total_resources } = node;
  const isSelected = find(selectedNodes.include, { pk: node.pk });
  const ancestorIsSelected = find(selectedNodes.include, n => node.path.includes(n.pk));

  // Completely on device -> DISABLED
  if (resources_on_device === total_resources) {
    return {
      ...node,
      message: translator.$tr('alreadyOnYourDevice'),
      disabled: true,
      checkboxType: CheckboxTypes.CHECKED,
    };
  }

  if (isSelected || ancestorIsSelected) {
    const omittedDescendants = selectedNodes.omit.filter(n => n.path.includes(node.pk));

    if (omittedDescendants.length > 0) {
      const omittedResources = sumBy(omittedDescendants, 'total_resources');

      // All descendants are omitted -> UNCHECKED
      if (omittedResources === total_resources) {
        return {
          ...node,
          message: '',
          disabled: false,
          checkboxType: CheckboxTypes.UNCHECKED,
        };
      }

      // Some (but not all) descendants are omitted -> INDETERMINATE
      return {
        ...node,
        message: translator.$tr('fractionOfResourcesSelected', {
          selected: total_resources - omittedResources,
          total: total_resources,
        }),
        disabled: false,
        checkboxType: CheckboxTypes.INDETERMINATE,
      };
    }

    // Completely selected -> CHECKED
    return {
      ...node,
      message: translator.$tr('resourcesSelected', { total: total_resources }),
      disabled: false,
      checkboxType: CheckboxTypes.CHECKED,
    };
  }

  if (resources_on_device > 0) {
    // Node has some (but not all) resources on device -> UNCHECKED.
    // Node with all resources on device handled earlier.
    return {
      ...node,
      message: translator.$tr('fractionOfResourcesOnDevice', {
        onDevice: resources_on_device,
        total: total_resources,
      }),
      disabled: false,
      checkboxType: CheckboxTypes.UNCHECKED,
    };
  }

  const includedDescendants = selectedNodes.include.filter(n => n.path.includes(node.pk));

  if (includedDescendants.length > 0) {
    const includedDescendantsResources = sumBy(includedDescendants, 'total_resources');

    // Node is not selected, has all children selected -> CHECKED
    if (includedDescendantsResources === total_resources) {
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
        selected: includedDescendantsResources,
        total: total_resources,
      }),
      disabled: false,
      checkboxType: CheckboxTypes.INDETERMINATE,
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
export function transformBreadrumb({ title, pk }) {
  return {
    text: title || 'No title',
    link: {
      name: 'treeview_update_topic',
      query: {
        pk,
      },
      params: {
        pk,
        title,
        replaceCrumbs: true,
      },
    },
  };
}
