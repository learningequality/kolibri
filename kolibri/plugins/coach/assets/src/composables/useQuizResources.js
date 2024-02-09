import { get, set } from '@vueuse/core';
import { computed, ref } from 'kolibri.lib.vueCompositionApi';
import { validateObject } from 'kolibri.utils.objectSpecs';
import { ContentNodeResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import logging from 'kolibri.lib.logging';
import useFetchTree from './useFetchTree';
import { QuizExercise } from './quizCreationSpecs.js';

const logger = logging.getLogger(__filename);

/**
 * @typedef {Object} QuizResourcesConfig
 * @property { computed <string|null|undefined> } topicId - The id of the root node to fetch the
 * children for
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

  // Initialize useFetchTree methods with the given topicId computed property and params
  const { topic, fetchTree, fetchMore, hasMore, loading: treeLoading } = useFetchTree({
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
   * @param {string[]} topicsIds - The list of topics IDs to fetch descendant counts for
   * @affects _resources - The topicIds passed here will have their `num_assessments` property
   *    added to the corresponding Topic within _resources
   * @returns {Promise<null>} - A promise that resolves when the annotations have been made and
   *   the_resources have been updated, filtering out all topics which do not have assessments
   */
  async function annotateTopicsWithDescendantCounts(topicIds = []) {
    const promises = [
      ContentNodeResource.fetchDescendantsAssessments(topicIds),
      ContentNodeResource.fetchDescendants(topicIds, {
        descendant__kind: ContentNodeKinds.EXERCISE,
      }),
    ];
    return Promise.all(promises)
      .then(([{ data: topicsWithAssessmentCounts }, { data: exerciseDescendants }]) => {
        const childrenWithAnnotatedTopics = get(_resources)
          .map(node => {
            // We'll map so that the topics are updated in place with the num_assessments, others
            // are left as-is
            if ([ContentNodeKinds.TOPIC, ContentNodeKinds.CHANNEL].includes(node.kind)) {
              const topicWithAssessments = topicsWithAssessmentCounts.find(t => t.id === node.id);
              if (topicWithAssessments) {
                node.num_assessments = topicWithAssessments.num_assessments;
              }
              exerciseDescendants.forEach(exercise => {
                if (exercise.ancestor_id === node.id) {
                  node.num_exercises ? (node.num_exercises += 1) : (node.num_exercises = 1);
                }
              });

              if (!validateObject(node, QuizExercise)) {
                logger.error('Topic node was not a valid QuizExercise after annotation:', node);
              }
            }
            return node;
          })
          .filter(node => {
            // Only keep topics which have assessments in them to begin with
            return (
              node.kind === ContentNodeKinds.EXERCISE ||
              ([ContentNodeKinds.TOPIC, ContentNodeKinds.CHANNEL].includes(node.kind) &&
                node.num_assessments > 0)
            );
          });
        setResources(childrenWithAnnotatedTopics);
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
      setResources(results);
      return annotateTopicsWithDescendantCounts(
        results.filter(({ kind }) => kind === ContentNodeKinds.TOPIC).map(topic => topic.id)
      ).then(() => set(_loading, false));
    });
  }

  /**
   *  @affects _resources - Appends the results of the fetchMore call to the _resources
   *    and annotates any new topics with descendant counts
   *  @affects _loading - fetchMore & annotateTopicsWithDescendantCounts update the loading states
   */
  async function fetchMoreQuizResources() {
    set(_loading, true);
    return fetchMore().then(async results => {
      set(_resources, [...get(_resources), ...results]);
      return annotateTopicsWithDescendantCounts(
        results.filter(({ kind }) => kind === ContentNodeKinds.TOPIC).map(topic => topic.id)
      ).then(() => set(_loading, false));
    });
  }

  /** @returns {Boolean} Whether the given node should be displayed with a checkbox
   * @description Returns whether the given node is an exercise or not -- although, could be
   * extended in the future to permit topic-level selection if desired
   */
  function hasCheckbox(node) {
    return node.kind === ContentNodeKinds.EXERCISE;
  }

  function setResources(r) {
    set(_resources, r);
  }

  return {
    setResources,
    resources: computed(() => get(_resources)),
    loading: computed(() => get(_loading) || get(treeLoading)),
    fetchQuizResources,
    fetchMoreQuizResources,
    hasCheckbox,
    hasMore,
    topic,
    annotateTopicsWithDescendantCounts,
  };
}
