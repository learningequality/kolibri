import { get, set } from '@vueuse/core';
import { computed, ref, provide, inject } from 'kolibri.lib.vueCompositionApi';
import { ContentNodeResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

/**
 * @module useExerciseResources
 * @description A system for fetching exercises and massaging them into the format we need to
 * display them in the app. Providing annotations, methods for pagination, and other utilities
 * related to the navigation of topics and their exercise descendants.
 *
 * Set the topicId for which you want to view the descendants and then the computed properties
 * will reflect that topic's descendants automatically (with a loading state set accordingly).
 *
 * This is intended for use in a use case where the user is navigating the content tree in order
 * to select contents.
 *
 * This module also reflects the pattern used by the ContentNodeResource.fetchTree method which
 * provides metadata with which we can easily implement lazy loading of content nodes. In short, we
 * get a `more` object which gives us the paramaters we need to use to fetch the next batch of nodes
 * if they're available under the current topic.
 *
 */
export default function useExerciseResources() {
  /** @type {ref<string>} The topicId for which we will reflect the child nodes */
  const _currentTopicId = ref(null);

  /** @type {ref<Boolean>} Whether we are currently fetching/processing the child nodes */
  const _loading = ref(false);

  const _kindsToFetch = ref([ContentNodeKinds.EXERCISE, ContentNodeKinds.TOPIC]);

  /** @type {ref<Array>} The list of child nodes for the current topic. */
  const _contentList = ref([]);

  /** @type {ref<Object>} The params object we pass to the ContentNodeResource fetchTree method to
   * fetch the next batch of nodes.
   */
  const _moreParams = ref(null);

  function _numAssessmentsInFetchedChildren(topic) {
    if (!topic.children) {
      return 0;
    } else {
      return topic.children.reduce((acc, child) => {
        acc += child.children.length || 0;
        return acc;
      }, 0);
    }
  }

  /**
   * @param {Object} topic The topic object to check -- must be annotated with the `num_assessments`
   * property -- which means you should be passing a topic that you found in the contentList
   */
  function shouldTopicHaveCheckbox(topic) {
    const num_assessments = topic.num_assessments;
    if (num_assessments === undefined) {
      console.error(
        'You cannot pass a topic that has not been annotated with the `num_assessments` property.',
        'You should be passing a topic that you found in the contentList.'
      );
    }
    if (get(_contentList).children) {
      const childTopicIds = get(_contentList)
        .filter(({ kind }) => kind === ContentNodeKinds.TOPIC)
        .map(({ id }) => id);
    }
  }

  function topicInChildrenHasMore() {}

  function fetchMore() {
    if (get(_moreParams)) {
      fetchContentList(_moreParams);
    } else {
      console.error("No more params to fetch. There shouldn't be a 'Show More' button visible.");
    }
  }

  /**
   * @param {Boolean} appendResults Whether to append the results to the current list or replace it
   */
  function fetchContentList(moreParams = null) {
    set(_loading, true);

    // Set the default params for the fetchTree method .
    const params = {
      ...(moreParams || {}),
      ...{
        kind_in: get(_kindsToFetch),
        include_coach_content: true,
      },
    };

    ContentNodeResource.fetchTree({
      id: get(_currentTopicId),
      params,
    }).then(topicTree => {
      // results is the list of all children
      // more is an object that contains the parameters we need to fetch the next batch of nodes
      const { results, more } = topicTree.children;
      const topicResults = results.filter(({ kind }) => kind === ContentNodeKinds.TOPIC);
      const exerciseResults = results.filter(({ kind }) => kind === ContentNodeKinds.EXERCISE);

      console.log(results);
      console.log(more);

      console.log('fetching descendant assessments');
      ContentNodeResource.fetchDescendantsAssessments(results.map(topic => topic.id))
        .then(({ data: topicsHasDescendantCounts }) => {
          // Just get the IDs of the topics that have descendant exercises
          const topicIdsWithDescendantCounts = topicsHasDescendantCounts
            .filter(topic => topic.num_assessments > 0)
            .map(topic => topic.id);

          // Now, filter the topicResults to only include those topics
          const topicsToAnnotate = topicResults.filter(topic =>
            topicIdsWithDescendantCounts.includes(topic.id)
          );

          // Return those topics annotated to include the `num_assessments` property
          return topicsToAnnotate.map(topic => {
            topic.num_assessments = topicsHasDescendantCounts.find(
              t => t.id === topic.id
            ).num_assessments;
            return topic;
          });
        })
        .then(topicsWithCounts => {
          const currentTopicContentList = topicsWithCounts.concat(exerciseResults);
          if (moreParams) {
            set(_contentList, [...get(_contentList), ...currentTopicContentList]);
          } else {
            set(_contentList, currentTopicContentList);
          }
        })
        .then(() => set(_loading, false))
        .catch(e => {
          // TODO Work out best UX for this situation -- it may depend on if we're fetching more
          // or the initial list of contents
          console.error(e);
          set(_loading, false);
        });
    });
  }

  /**
   * @param {string} topicId The topicId for which we want to fetch the descendants
   */
  function setCurrentTopicId(topicId) {
    set(_currentTopicId, topicId);
    fetchContentList();
  }

  return {
    fetchContentList,
    setCurrentTopicId,
    loading: computed(() => get(_loading)),
  };
}
