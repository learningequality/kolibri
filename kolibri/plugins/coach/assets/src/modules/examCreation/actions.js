import pickBy from 'lodash/pickBy';
import uniq from 'lodash/uniq';
import unionBy from 'lodash/unionBy';
import union from 'lodash/union';
import shuffle from 'kolibri.lib.shuffle';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { ContentNodeResource, ContentNodeSearchResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import router from 'kolibri.coreVue.router';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { PageNames } from '../../constants';
import { createExam } from '../shared/exams';
import selectQuestions from './selectQuestions';

const snackbarTranslator = createTranslator('ExamCreateSnackbarTexts', {
  newExamCreated: 'New quiz created',
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

export function createExamAndRoute(store) {
  const exam = {
    collection: store.rootState.classId,
    channel_id: 'no channel',
    title: store.state.title,
    question_count: store.state.numberOfQuestions,
    question_sources: store.state.selectedQuestions,
    assignments: [{ collection: store.rootState.classId }],
    learners_see_fixed_order: store.state.learnersSeeFixedOrder,
  };

  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  createExam(store, exam).then(
    () => {
      router.push({ name: PageNames.EXAMS });
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

export function updateSelectedQuestions(store) {
  if (!store.state.selectedExercises.length) {
    return Promise.resolve([]);
  }

  return new Promise(resolve => {
    // The selectedExercises don't necessarily have the assessment metadata so fetch them.
    // However, if there are more exercises than questions, no need to fetch them all so
    // choose N at random where N is the the number of questions.
    const exerciseIds = shuffle(
      uniq(store.state.selectedExercises.map(exercise => exercise.id)),
      store.state.seed
    ).slice(0, store.state.numberOfQuestions);

    ContentNodeResource.fetchCollection({
      getParams: { ids: exerciseIds },
    }).then(contentNodes => {
      store.commit('UPDATE_SELECTED_EXERCISES', contentNodes); // update with full metadata
      const exercises = {};
      contentNodes.forEach(exercise => {
        exercises[exercise.id] = exercise;
      });
      const exerciseTitles = exerciseIds.map(id => exercises[id].title);
      const questionIdArrays = exerciseIds.map(
        id => assessmentMetaDataState(exercises[id]).assessmentIds
      );
      store.commit(
        'SET_SELECTED_QUESTIONS',
        selectQuestions(
          store.state.numberOfQuestions,
          exerciseIds,
          exerciseTitles,
          questionIdArrays,
          store.state.seed
        )
      );
      resolve();
    });
  });
}

export function getNewQuestionSet(store) {
  return store.dispatch('loading', {}, { root: true }).then(() => {
    store.commit('RANDOMIZE_SEED');
    store.dispatch('updateSelectedQuestions').then(() => {
      store.dispatch('notLoading', {}, { root: true });
    });
  });
}
