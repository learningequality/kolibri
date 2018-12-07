import pickBy from 'lodash/pickBy';
import uniq from 'lodash/uniq';
import unionBy from 'lodash/unionBy';
import union from 'lodash/union';
import { ContentNodeResource, ContentNodeSearchResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import router from 'kolibri.coreVue.router';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { PageNames } from '../../constants';
import { _createExam } from '../shared/exams';

const snackbarTranslator = createTranslator('ExamCreateSnackbarTexts', {
  newExamCreated: 'New exam created',
});

export function resetExamCreationState(store) {
  store.commit('RESET_STATE');
}

export function addToSelectedExercises(store, exercises) {
  store.commit('ADD_TO_SELECTED_EXERCISES', exercises);
  return updateAvailableQuestions(store);
}

export function removeFromSelectedExercises(store, exercises) {
  store.commit('REMOVE_FROM_SELECTED_EXERCISES', exercises);
  return updateAvailableQuestions(store);
}

export function setSelectedExercises(store, exercises) {
  store.commit('SET_SELECTED_EXERCISES', exercises);
  return updateAvailableQuestions(store);
}

export function updateAvailableQuestions(store) {
  const { selectedExercises } = store.state;
  if (selectedExercises.length > 0) {
    return ContentNodeResource.fetchNodeAssessments(selectedExercises.map(ex => ex.id)).then(
      resp => {
        store.commit('SET_AVAILABLE_QUESTIONS', resp.entity);
      }
    );
  }
  store.commit('SET_AVAILABLE_QUESTIONS', 0);
  return Promise.resolve();
}

export function fetchAdditionalSearchResults(store, params) {
  let kinds;
  if (params.kind) {
    kinds = [params.kind];
  } else {
    kinds = [ContentNodeKinds.EXERCISE, ContentNodeKinds.TOPIC];
  }
  return ContentNodeSearchResource.fetchCollection({
    getParams: {
      ...pickBy({
        search: params.searchTerm,
        channel_id: params.channelId,
        exclude_content_ids: store.state.searchResults.contentIdsFetched,
      }),
      kind_in: kinds,
      include_fields: ['num_coach_contents'],
    },
  }).then(results => {
    return filterAndAnnotateContentList(results.results).then(contentList => {
      const updatedChannelIds = union(store.state.searchResults.channel_ids, results.channel_ids);
      const updatedContentKinds = union(
        store.state.searchResults.content_kinds,
        results.content_kinds
      ).filter(kind => [ContentNodeKinds.TOPIC, ContentNodeKinds.EXERCISE].includes(kind));
      const updatedResults = unionBy([...store.state.searchResults.results, ...contentList], 'id');
      const updatedContentIdsFetched = uniq([
        ...store.state.searchResults.contentIdsFetched,
        ...results.results.map(({ content_id }) => content_id),
      ]);
      const searchResults = {
        total_results: store.state.searchResults.total_results,
        channel_ids: updatedChannelIds,
        content_kinds: updatedContentKinds,
        results: updatedResults,
        contentIdsFetched: updatedContentIdsFetched,
      };
      store.commit('SET_SEARCH_RESULTS', searchResults);
    });
  });
}

export function createExamAndRoute(store, exam) {
  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  _createExam(store, exam).then(
    () => {
      router.getInstance().push({ name: PageNames.EXAMS });
      store.dispatch(
        'createSnackbar',
        {
          text: snackbarTranslator.$tr('newExamCreated'),
          autoDismiss: true,
        },
        { root: true }
      );
    },
    error => store.dispatch('handleApiError', error, { root: true })
  );
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
      response.entity.forEach(descendantAssessments => {
        if (descendantAssessments.num_assessments > 0) {
          topicsWithExerciseDescendants.push({
            id: descendantAssessments.id,
            numAssessments: descendantAssessments.num_assessments,
            exercises: [],
          });
        }
      });

      ContentNodeResource.fetchDescendants(topicsWithExerciseDescendants.map(topic => topic.id), {
        descendant_kind: ContentNodeKinds.EXERCISE,
      }).then(response => {
        response.entity.forEach(exercise => {
          const topic = topicsWithExerciseDescendants.find(t => t.id === exercise.ancestor_id);
          topic.exercises.push(exercise);
        });
        resolve(topicsWithExerciseDescendants);
      });
    });
  });
}

export function filterAndAnnotateContentList(childNodes) {
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
