import pickBy from 'lodash/pickBy';
import uniq from 'lodash/uniq';
import unionBy from 'lodash/unionBy';
import union from 'lodash/union';
import shuffled from 'kolibri.utils.shuffled';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { ContentNodeResource, ContentNodeSearchResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import router from 'kolibri.coreVue.router';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { PageNames } from '../../constants';
import { MAX_QUESTIONS } from '../../constants/examConstants';
import { createExam } from '../examShared/exams';
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

export function updateAvailableQuestions(store) {
  const { selectedExercises } = store.state;
  // Only bother checking this if there is any doubt that we have sufficient
  // questions available. If we have selected more exercises than we allow questions
  // then we are sure to have this.
  if (Object.keys(selectedExercises).length > 0) {
    if (MAX_QUESTIONS > Object.keys(selectedExercises).length) {
      return ContentNodeResource.fetchNodeAssessments(Object.keys(selectedExercises)).then(resp => {
        store.commit('SET_AVAILABLE_QUESTIONS', resp.entity);
      });
    } else {
      store.commit('SET_AVAILABLE_QUESTIONS', MAX_QUESTIONS);
      return Promise.resolve();
    }
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

export function createExamAndRoute(store, { classId, adHocGroupId }) {
  const exam = {
    collection: classId,
    title: store.state.title,
    seed: store.state.seed,
    question_count: store.state.selectedQuestions.length,
    question_sources: store.state.selectedQuestions,
    assignments: [{ collection: classId }, { collection: adHocGroupId }],
    learners_see_fixed_order: store.state.learnersSeeFixedOrder,
    date_archived: null,
    date_activated: null,
  };

  return createExam(store, exam).then(() => {
    router.push({ name: PageNames.EXAMS });
    store.dispatch('createSnackbar', snackbarTranslator.$tr('newExamCreated'), { root: true });
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
  if (!Object.keys(store.state.selectedExercises).length) {
    store.commit('SET_SELECTED_QUESTIONS', []);
    return Promise.resolve();
  }

  return new Promise(resolve => {
    // If there are more exercises than questions, no need to fetch them all so
    // choose N at random where N is the the number of questions.
    const exerciseIds = shuffled(
      Object.keys(store.state.selectedExercises),
      store.state.seed
    ).slice(0, store.state.numberOfQuestions);

    store.commit('LOADING_NEW_QUESTIONS', true);

    // The selectedExercises don't have the assessment metadata yet so fetch that
    ContentNodeResource.fetchCollection({
      getParams: { ids: exerciseIds },
    }).then(contentNodes => {
      store.commit('UPDATE_SELECTED_EXERCISES', contentNodes); // update with full metadata
      const exercises = {};
      contentNodes.forEach(exercise => {
        exercises[exercise.id] = exercise;
      });
      const availableExercises = exerciseIds.filter(id => exercises[id]);
      const exerciseTitles = availableExercises.map(id => exercises[id].title);
      const questionIdArrays = availableExercises.map(
        id => assessmentMetaDataState(exercises[id]).assessmentIds
      );
      store.commit(
        'SET_SELECTED_QUESTIONS',
        selectQuestions(
          store.state.numberOfQuestions,
          availableExercises,
          exerciseTitles,
          questionIdArrays,
          store.state.seed
        )
      );
      store.commit('LOADING_NEW_QUESTIONS', false);
      resolve();
    });
  });
}
