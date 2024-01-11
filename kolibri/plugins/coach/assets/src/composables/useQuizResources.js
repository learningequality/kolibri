import { get, set } from '@vueuse/core';
import { computed, onMounted, ref, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
import { validateObject } from 'kolibri.utils.objectSpecs';
import { ContentNodeResource, ChannelResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import useFetchTree from './useFetchTree';
import { QuizExercise } from './quizCreationSpecs.js';

/**
 * @typedef {Object} QuizResourcesConfig
 * @property {computedRef<string|null|undefined>} topicId - The id of the root node to fetch the children for
 */

/**
 * @module useQuizResources
 * @param {QuizResourcesConfig} config
 */
export default function useQuizResources({ topicId } = {}) {
  const params = {
    kind_in: [ContentNodeKinds.EXERCISE, ContentNodeKinds.TOPIC],
    include_coach_content: true,
  };
  const { fetchTree, fetchMore, hasMore, loading: treeLoading } = useFetchTree({ topicId, params });

  /** @type {ref<ExerciseResource[]>} All resources which have been fetched that are the children of
   * the given topicId annotated with assessment metadata */
  const _resources = ref([]);

  /** @type {ref<Boolean>} Whether we are currently fetching/processing the child nodes */
  const _loading = ref(false);

  /**
   * Annotates the child TOPIC nodes with the number of assessments that are contained within them
   * @param {ContentNode[]} topics - The list of topics nodes to annotate with their descendant count
   * @affects _resources - The topicIds passed here will have their `num_assessments` property
   *    added to the corresponding Topic within _resources
   * @returns {Promise<null>} - A promise that resolves when the annotations have been made and
   *   the _resources have been updated
   */
  function annotateTopicsWithDescendantCounts(topics = []) {
    const topicIds = topics
      .filter(topic => topic.kind === ContentNodeKinds.TOPIC)
      .map(topic => topic.id);

    if (topicIds.length !== topics.length) {
      console.warn('Not all of the nodes passed to annotateTopicsWithDescendantCounts were topics');
    }

    return ContentNodeResource.fetchDescendantsAssessments(topicIds)
      .then(({ data: topicsWithDescendantCounts }) => {
        const childrenWithAnnotatedTopics = get(_resources).map(node => {
          // We'll map so that the topics are updated in place with the num_assessments, others are
          // left as-is
          if (node.kind === ContentNodeKinds.TOPIC) {
            const topic = topicsWithDescendantCounts.find(t => t.id === node.id);
            if (topic) {
              node.num_assessments = topic.num_assessments;
            }
            if (!validateObject(node, QuizExercise)) {
              console.warn('Topic node was not a valid QuizExercise after annotation:', node);
            }
          }

          return node;
        });
        set(_resources, childrenWithAnnotatedTopics);
      })
      .catch(e => {
        // TODO Work out best UX for this situation -- it may depend on if we're fetching more
        // or the initial list of contents
        console.error(e);
      });
  }

  /**
   *  @affects _resources - Sets the _resources to the results of the fetchTree call
   *  @affects _loading
   */
  function fetchQuizResources() {
    set(_loading, true);
    fetchTree().then(results => {
      set(_resources, results);
      annotateTopicsWithDescendantCounts(
        results.filter(({ kind }) => kind === ContentNodeKinds.TOPIC).map(topic => topic.id)
      ).then(() => set(_loading, false));
    });
  }

  /**
   *  @affects _resources - Appends the results of the fetchMore call to the _resources
   *    and annotates any new topics with descendant counts
   *  @affects _loading - fetchMore & annotateTopicsWithDescendantCounts update the loading states
   */
  function fetchMoreQuizResources() {
    set(_loading, true);
    fetchMore().then(results => {
      set(_resources, [...get(_resources), ...results]);
      annotateTopicsWithDescendantCounts(
        results.filter(({ kind }) => kind === ContentNodeKinds.TOPIC).map(topic => topic.id)
      ).then(() => set(_loading, false));
    });
  }

  /** @returns {Boolean} Whether the given node should be displayed with a checkbox
   * currently passes when the node is an Exercise or if it is a topic with fewer than 20
   * assessments in its descendants tree */
  function hasCheckbox(node) {
    return node.kind === ContentNodeKinds.EXERCISE || node.num_assessments <= 20;
  }

  return {
    resources: computed(() => get(_resources)),
    loading: computed(() => get(_loading) || get(treeLoading)),
    fetchQuizResources,
    fetchMoreQuizResources,
    hasCheckbox,
    hasMore,
  };
}
