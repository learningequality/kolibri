import { ref, onMounted } from 'kolibri.lib.vueCompositionApi';
import { ChannelResource,ContentNodeResource} from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';

export function useResources() {
  const resources = ref(null);
  const channels = ref([]);
  const bookmarks = ref([]);

  function fetchChannelResource() {
    ChannelResource.fetchCollection({ params: { has_exercises: true, available: true } }).then(
      response => {
        channels.value = response;
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
            const topic = topicsWithExerciseDescendants.find(t => t.id === exercise.ancestor_id);
            topic.exercises.push(exercise);
          });
          resolve(topicsWithExerciseDescendants);
        });
      });
    });
  }
  
  function filterAndAnnotateContentList(childNodes) {
    return new Promise(resolve => {
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
            if (childNode.kind === ContentNodeKinds.TOPIC && (childNode.numAssessments || 0) < 1) {
              return false;
            }
            return true;
          });
  
        const contentList = childNodesWithExerciseDescendants.map(node => ({
          ...node,
          thumbnail: getContentNodeThumbnail(node),
        }));
        resolve(contentList);
      });
    });
  }

  onMounted(() => {
    fetchChannelResource();
    fetchBookMarkedResource();
    filterAndAnnotateContentList()
  });

  return {
    resources,
    channels,
    bookmarks,
  };
}
