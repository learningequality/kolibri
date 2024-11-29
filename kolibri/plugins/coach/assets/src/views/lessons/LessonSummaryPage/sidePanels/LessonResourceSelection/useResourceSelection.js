import uniqBy from 'lodash/uniqBy';
import { ref, provide, inject, computed, getCurrentInstance, watch } from '@vue/composition-api';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import useFetch from './useFetch';

export default function useResourceSelection() {
  const store = getCurrentInstance().proxy.$store;
  const route = computed(() => store.state.route);
  const topicId = computed(() => route.value.query.topicId);

  const selectedResources = ref([]);

  const bookmarksFetch = useFetch({
    fetchMethod: () =>
      ContentNodeResource.fetchBookmarks({
        params: { limit: 25, available: true },
      }),
    fetchMoreMethod: more =>
      ContentNodeResource.fetchBookmarks({
        params: more,
      }),
    dataKey: 'results',
    moreKey: 'more',
    additionalDataKeys: {
      count: 'count',
    },
  });

  const channelsFetch = useFetch({
    fetchMethod: () =>
      ChannelResource.fetchCollection({
        getParams: {
          available: true,
        },
      }),
  });

  const treeFetch = useFetch({
    fetchMethod: () =>
      ContentNodeResource.fetchTree({ id: topicId.value, params: { include_coach_content: true } }),
    fetchMoreMethod: more => ContentNodeResource.fetchTree({ id: topicId.value, params: more }),
    dataKey: 'children.results',
    moreKey: 'children.more.params',
    additionalDataKeys: {
      topic: '', // return the whole response as topic
    },
  });

  const topic = computed(() => {
    if (topicId.value) {
      const { additionalData } = treeFetch;
      const { topic } = additionalData.value;
      return topic;
    }
    return null;
  });

  watch(topicId, () => {
    if (topicId.value) {
      treeFetch.fetchData();
    }
  });

  const loading = computed(() => {
    const sources = [bookmarksFetch, channelsFetch, treeFetch];

    return sources.some(sourceFetch => sourceFetch.loading.value);
  });

  const fetchInitialData = async () => {
    bookmarksFetch.fetchData();
    channelsFetch.fetchData();
    if (topicId.value) {
      treeFetch.fetchData();
    }
  };

  fetchInitialData();

  const selectResources = (resources = []) => {
    if (resources.length === 1) {
      const [newResource] = resources;
      if (!selectedResources.value.find(res => res.id === newResource.id)) {
        selectedResources.value = [...selectedResources.value, newResource];
      }
    } else {
      selectedResources.value = uniqBy([...selectedResources.value, ...resources], 'id');
    }
  };

  const deselectResources = (resources = []) => {
    selectedResources.value = selectedResources.value.filter(res => {
      return !resources.find(unselectedResource => unselectedResource.id === res.id);
    });
  };

  const setSelectedResources = (resources = []) => {
    selectedResources.value = resources;
  };

  const selectionRules = [];

  provide('topic', topic);
  provide('channelsFetch', channelsFetch);
  provide('bookmarksFetch', bookmarksFetch);
  provide('treeFetch', treeFetch);
  provide('selectionRules', selectionRules);
  provide('selectedResources', selectedResources);
  provide('selectResources', selectResources);
  provide('deselectResources', deselectResources);
  provide('setSelectedResources', setSelectedResources);

  return {
    loading,
    selectedResources,
  };
}

export function injectResourceSelection() {
  const topic = inject('topic');
  const channelsFetch = inject('channelsFetch');
  const bookmarksFetch = inject('bookmarksFetch');
  const treeFetch = inject('treeFetch');
  const selectionRules = inject('selectionRules');
  const selectedResources = inject('selectedResources');
  const selectResources = inject('selectResources');
  const deselectResources = inject('deselectResources');
  const setSelectedResources = inject('setSelectedResources');

  return {
    topic,
    channelsFetch,
    bookmarksFetch,
    treeFetch,
    selectionRules,
    selectResources,
    deselectResources,
    selectedResources,
    setSelectedResources,
  };
}
