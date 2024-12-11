import { get, set } from '@vueuse/core';
import { computed, ref } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { ContentNodeKinds } from 'kolibri/constants';
import logging from 'kolibri-logging';
import useFetchTree from './useFetchTree';

const logger = logging.getLogger(__filename);
const _loadingMore = ref(false);
/**
 * @typedef {Object} QuizResourcesConfig
 * @property { computed <string|null|undefined> } topicId - The id of the root node to fetch the
 * children for
 */

/**
 * @module useQuizResources
 * @param {QuizResourcesConfig} config
 */
export default function useQuizResources({ topicId, practiceQuiz = false } = {}) {
  const params = {
    kind_in: [ContentNodeKinds.EXERCISE, ContentNodeKinds.TOPIC],
    include_coach_content: true,
  };

  if (practiceQuiz) {
    params.contains_quiz = true;
  }

  // Initialize useFetchTree methods with the given topicId computed property and params
  const {
    topic,
    fetchTree,
    fetchMore,
    hasMore,
    loading: treeLoading,
  } = useFetchTree({
    topicId,
    params,
  });

  /** @type {ref<ExerciseResource[]>} All resources which have been fetched that are the children of
   * the given topicId annotated with assessment metadata */
  const _resources = ref([]);

  /** @type {ref<Boolean>} Whether we are currently fetching/processing the child nodes */
  const _loading = ref(false);

  /**
   * Annotates the child TOPIC nodes with the number of assessments that are contained within them
   * @param {ContentNode[]} results - The array of results from a content API call
   * @returns {Promise<ContentNode[]>} - A promise that resolves when the annotations have been
   *   made and returns the annotated results
   */
  async function annotateTopicsWithDescendantCounts(results) {
    const topicIds = results
      .filter(({ kind }) => kind === ContentNodeKinds.TOPIC || kind === ContentNodeKinds.CHANNEL)
      .map(topic => topic.id);
    return ContentNodeResource.fetchDescendantsAssessments(topicIds)
      .then(({ data: topicsWithAssessmentCounts }) => {
        const topicsWithAssessmentCountsMap = topicsWithAssessmentCounts.reduce((acc, topic) => {
          acc[topic.id] = topic.num_assessments;
          return acc;
        }, {});
        return (
          results
            .map(node => {
              // We'll map so that the topics are updated in place with the num_assessments, others
              // are left as-is
              if ([ContentNodeKinds.TOPIC, ContentNodeKinds.CHANNEL].includes(node.kind)) {
                if (!topicsWithAssessmentCountsMap[node.id]) {
                  // If there are no assessment descendants,
                  // return null so we can easily filter after
                  return null;
                }
                if (node.kind === ContentNodeKinds.TOPIC && !node.children) {
                  // If the topic has no children, we can assume it has no assessments
                  // Only do this check for topics, because CHANNEL kinds are normally
                  // ChannelMetadata objects masquerading as ContentNode objects
                  // and so don't have children
                  return null;
                }
                node.num_assessments = topicsWithAssessmentCountsMap[node.id];
              }
              return node;
            })
            // Filter out any topics that have no assessments
            // that we have already flagged as null above
            .filter(Boolean)
        );
      })
      .catch(e => {
        // TODO Work out best UX for this situation -- it may depend on if we're fetching more
        // or the initial list of contents
        logger.error(e);
      });
  }

  /**
   *  @affects _resources - Sets the _resources to the results of the fetchTree call
   *  @affects _loading
   *  @returns {Promise<null>} - A promise that resolves when the annotations have been made and
   */
  async function fetchQuizResources() {
    set(_loading, true);
    return fetchTree().then(async results => {
      return annotateTopicsWithDescendantCounts(results).then(annotatedResults => {
        setResources(annotatedResults);
        set(_loading, false);
      });
    });
  }

  /**
   *  @affects _resources - Appends the results of the fetchMore call to the _resources
   *    and annotates any new topics with descendant counts
   *  @affects _loading - fetchMore & annotateTopicsWithDescendantCounts update the loading states
   */
  async function fetchMoreQuizResources() {
    set(_loading, true);
    set(_loadingMore, true);
    return fetchMore().then(async results => {
      return annotateTopicsWithDescendantCounts(results).then(annotatedResults => {
        set(_resources, [...get(_resources), ...annotatedResults]);
        set(_loading, false);
        set(_loadingMore, false);
      });
    });
  }

  function setResources(r) {
    set(_resources, r);
  }

  return {
    setResources,
    resources: computed(() => get(_resources)),
    loading: computed(() => get(_loading) || get(treeLoading)),
    loadingMore: computed(() => get(_loadingMore)),
    fetchQuizResources,
    fetchMoreQuizResources,
    hasMore,
    topic,
    annotateTopicsWithDescendantCounts,
  };
}
