import { ref, computed } from 'kolibri.lib.vueCompositionApi';
import { ContentNodeResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import uniqWith from 'lodash/uniqWith';
import isEqual from 'lodash/isEqual';

// Reactive state
const _selectedResources = ref([]);
const resourcePool = ref([]);

const selectAllChecked = computed(() => {
  return resourcePool.value.length && resourcePool.value.every(isResourceSelected);
});

const selectAllIndeterminate = computed(() => {
  return !selectAllChecked.value && resourcePool.value.some(isResourceSelected);
});

function isResourceSelected(content) {
  return _selectedResources.value.includes(content.id);
}

function toggleTopicSelection({ content, checked }) {
  if (content.kind === ContentNodeKinds.TOPIC) {
    if (checked) {
      fetchTopicResources(content).then(resources => {
        addResourcesToPool(resources);
      });
    } else {
      // Remove all child resources of this topic
      removeResourcesFromPool(content);
    }
  } else {
    toggleResource(content, checked);
  }
}

function fetchTopicResources(topic) {
  return ContentNodeResource.fetchCollection({
    getParams: {
      descendant_of: topic.id,
      available: true,
    },
  });
}

function addResourcesToPool(resources) {
  resourcePool.value = uniqWith([...resourcePool.value, ...resources], isEqual);
}

function toggleResource(content, checked) {
  if (checked) {
    addResourcesToPool([content]);
  } else {
    removeResourcesFromPool(content);
  }
}

function removeResourcesFromPool(content) {
  resourcePool.value = resourcePool.value.filter(obj => obj.id !== content.id);
}

function resetSelectedResources() {
  resourcePool.value = [];
}

return {
  selectAllChecked,
  selectAllIndeterminate,
  toggleTopicSelection,
  resetSelectedResources,
  isResourceSelected,
};
