import { ref, onMounted } from 'kolibri.lib.vueCompositionApi';
import { ChannelResource, ContentNodeResource, ContentNodeSearchResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import { set } from '@vueuse/core';
// import pickBy from 'lodash/pickBy';
import uniq from 'lodash/uniq';
// import store from 'kolibri.coreVue.vuex.store';

export function useExerciseResources() {
  const resources = ref(null);
  const channels = ref([]);
  const bookmarks = ref([]);
  const channelTopics = ref([]);
  const contentList = ref([]);
  const ancestors = ref([]);
  const currentTopicId = ref(null);
  const currentTopic = ref(null);
  const currentTopicResource = ref(null);

  function fetchChannelResource() {
    ChannelResource.fetchCollection({ params: { has_exercises: true, available: true } }).then(
      response => {
        set(
          channels,
          response.map(chnl => {
            return {
              ...chnl,
              id: chnl.root,
              title: chnl.name,
              kind: ContentNodeKinds.CHANNEL,
              is_leaf: false,
            };
          })
        );
      }
    );
  }

  function fetchBookMarkedResource() {
    ContentNodeResource.fetchBookmarks({ params: { limit: 25, available: true } }).then(data => {
      bookmarks.value = data.results ? data.results : [];
    });
  }

  function _getTopicsWithExerciseDescendants(topicIds = []) {
    return new Promise(resolve => {
      if (!topicIds.length) {
        resolve([]);
        return;
      }
      const topicsNumAssessmentDescendantsPromise = ContentNodeResource.fetchDescendantsAssessments(
        topicIds
      );

      topicsNumAssessmentDescendantsPromise.then(response => {
        const topicsWithExerciseDescendants = [];
        response.data.forEach(descendantAssessments => {
          if (descendantAssessments.num_assessments > 0) {
            topicsWithExerciseDescendants.push({
              id: descendantAssessments.id,
              numAssessments: descendantAssessments.num_assessments,
              exercises: [],
            });
          }
        });

        ContentNodeResource.fetchDescendants(
          topicsWithExerciseDescendants.map(topic => topic.id),
          {
            descendant_kind: ContentNodeKinds.EXERCISE,
          }
        ).then(response => {
          response.data.forEach(exercise => {
            channelTopics.value.push(exercise);
            const topic = topicsWithExerciseDescendants.find(t => t.id === exercise.ancestor_id);
            topic.exercises.push(exercise);
          });
          channels.value = channelTopics.value;
          resolve(topicsWithExerciseDescendants);
        });
      });
    });
  }

  function fetchTopicResource(topicId) {
    const topicNodePromise = ContentNodeResource.fetchModel({ id: topicId });
    const childNodesPromise = ContentNodeResource.fetchCollection({
      getParams: {
        parent: topicId,
        kind_in: [ContentNodeKinds.TOPIC, ContentNodeKinds.EXERCISE],
      },
    });
    const loadRequirements = [topicNodePromise, childNodesPromise];

    return Promise.all(loadRequirements).then(([topicNode, childNodes]) => {
      return filterAndAnnotateContentList(childNodes).then(contentList => {
        // set(topicId, topicNode.id);
        ancestors.value = [...topicNode.ancestors, topicNode];
        return {
          ...topicNode,
          ...contentList,
          thumbnail: getContentNodeThumbnail(topicNode),
        };
      });
    });
  }

  function filterAndAnnotateContentList(childNodes) {
    return new Promise(resolve => {
      if (childNodes) {
        const childTopics = childNodes.filter(({ kind }) => kind === ContentNodeKinds.TOPIC);
        const topicIds = childTopics.map(({ id }) => id);
        const topicsThatHaveExerciseDescendants = _getTopicsWithExerciseDescendants(topicIds);
        topicsThatHaveExerciseDescendants.then(topics => {
          const childNodesWithExerciseDescendants = childNodes
            .map(childNode => {
              const index = topics.findIndex(topic => topic.id === childNode.id);
              if (index !== -1) {
                return { ...childNode, ...topics[index] };
              }
              return childNode;
            })
            .filter(childNode => {
              if (
                childNode.kind === ContentNodeKinds.TOPIC &&
                (childNode.numAssessments || 0) < 1
              ) {
                return false;
              }
              return true;
            });
          contentList.value = childNodesWithExerciseDescendants.map(node => ({
            ...node,
            thumbnail: getContentNodeThumbnail(node),
          }));
          channels.value = contentList.value;
          resolve(contentList);
        });
      }
    });
  }

  function showChannelLevel(store, params, query = {}) {
    let kinds;
    if (query.kind) {
      kinds = [query.kind];
    } else {
      kinds = [ContentNodeKinds.EXERCISE, ContentNodeKinds.TOPIC];
    }

    ContentNodeSearchResource.fetchCollection({
      getParams: {
        search: '',
        kind_in: kinds,
        // ...pickBy({ channel_id: query.channel }),
      },
    }).then(results => {
      return filterAndAnnotateContentList(results.results).then(contentList => {
        const searchResults = {
          ...results,
          results: contentList,
          content_kinds: results.content_kinds.filter(kind =>
            [ContentNodeKinds.TOPIC, ContentNodeKinds.EXERCISE].includes(kind)
          ),
          contentIdsFetched: uniq(results.results.map(({ content_id }) => content_id)),
        };

        this.channels.value = searchResults.results;
        console.log(searchResults.results);
      });
    });
  }

  onMounted(() => {
    fetchChannelResource();
    fetchBookMarkedResource();
    filterAndAnnotateContentList();
    _getTopicsWithExerciseDescendants([]);
  });

  return {
    resources,
    channels,
    bookmarks,
    contentList,
    channelTopics,
    currentTopicId,
    currentTopic,
    currentTopicResource,
    ancestors,
    fetchChannelResource,
    filterAndAnnotateContentList,
    _getTopicsWithExerciseDescendants,
    showChannelLevel,
    fetchTopicResource,
  };
}
