import differenceBy from 'lodash/differenceBy';
import { ChannelResource, ContentNodeResource, ContentNodeSlimResource } from 'kolibri.resources';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { createTranslator } from 'kolibri.utils.i18n';
import { PageNames } from '../../constants';
import { _createExam } from '../shared/exams';

const translator = createTranslator('ExamCreatePageTexts', {
  allChannels: 'All channels',
});

const snackbarTranslator = createTranslator('ExamCreateSnackbarTexts', {
  newExamCreated: 'New exam created',
});

function _exercisesState(exercises) {
  return exercises.map(exercise => ({
    ...exercise,
    numAssessments: assessmentMetaDataState(exercise).assessmentIds.length,
  }));
}

function _currentTopicState(topic, ancestors = []) {
  return {
    id: topic.id,
    title: topic.title,
    num_coach_contents: topic.num_coach_contents,
    breadcrumbs: [
      { id: null, title: translator.$tr('allChannels') },
      ...ancestors,
      { id: topic.id, title: topic.title },
    ],
  };
}

export function getAllExercisesWithinTopic(store, topicId) {
  return new Promise((resolve, reject) => {
    const exercisesPromise = ContentNodeResource.fetchDescendantsCollection(topicId, {
      descendant_kind: ContentNodeKinds.EXERCISE,
      fields: ['id', 'title', 'content_id', 'assessmentmetadata', 'num_coach_contents'],
    });

    ConditionalPromise.all([exercisesPromise]).only(
      samePageCheckGenerator(store),
      ([exercisesCollection]) => {
        const exercises = _exercisesState(exercisesCollection);
        resolve(exercises);
      },
      error => reject(error)
    );
  });
}

export function addExercise(store, exercise) {
  const { selectedExercises } = store.state;
  if (!selectedExercises.some(selectedExercise => selectedExercise.id === exercise.id)) {
    setSelectedExercises(store, selectedExercises.concat(exercise));
  }
}

export function addExercisesToExam(store, exercises) {
  const { selectedExercises } = store.state;
  // filter for exercises that are not yet selected
  const newExercises = differenceBy(exercises, selectedExercises, 'id');
  return setSelectedExercises(store, selectedExercises.concat(newExercises));
}

export function removeExercisesFromExam(store, exercises) {
  const { selectedExercises } = store.state;
  const newExercises = differenceBy(selectedExercises, exercises, 'id');
  return setSelectedExercises(store, newExercises);
}

export function removeExercise(store, exercise) {
  let { selectedExercises } = store.state;
  selectedExercises = selectedExercises.filter(
    selectedExercise => selectedExercise.id !== exercise.id
  );
  setSelectedExercises(store, selectedExercises);
}

export function setSelectedExercises(store, selectedExercises) {
  store.commit('SET_SELECTED_EXERCISES', selectedExercises);
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

// fetches topic, it's children subtopics, and children exercises
// TODO: Optimize
function fetchTopic(store, topicId) {
  return new Promise((resolve, reject) => {
    const topicPromise = ContentNodeResource.fetchModel({ id: topicId });
    const ancestorsPromise = ContentNodeSlimResource.fetchAncestors(topicId);
    const subtopicsPromise = ContentNodeSlimResource.fetchCollection({
      getParams: {
        parent: topicId,
        kind: ContentNodeKinds.TOPIC,
        fields: ['id', 'title', 'num_coach_contents'],
      },
    });
    const exercisesPromise = ContentNodeResource.fetchCollection({
      getParams: {
        parent: topicId,
        kind: ContentNodeKinds.EXERCISE,
        fields: ['id', 'title', 'content_id', 'assessmentmetadata', 'num_coach_contents'],
      },
    });
    ConditionalPromise.all([
      topicPromise,
      subtopicsPromise,
      exercisesPromise,
      ancestorsPromise,
    ]).only(
      samePageCheckGenerator(store),
      ([topicModel, subtopicsCollection, exercisesCollection, ancestors]) => {
        const topic = _currentTopicState(topicModel, ancestors);
        const exercises = _exercisesState(exercisesCollection);
        let subtopics = [...subtopicsCollection];

        const subtopicsExercisesPromises = subtopics.map(subtopic =>
          getAllExercisesWithinTopic(store, subtopic.id)
        );

        ConditionalPromise.all(subtopicsExercisesPromises).only(
          samePageCheckGenerator(store),
          subtopicsExercises => {
            subtopics = subtopics
              .map((subtopic, index) => {
                subtopic.allExercisesWithinTopic = subtopicsExercises[index];
                return subtopic;
              })
              .filter(subtopic => subtopic.allExercisesWithinTopic.length > 0);

            resolve({ topic, subtopics, exercises });
          },
          error => reject(error)
        );
      },
      error => reject(error)
    );
  });
}

export function goToTopic(store, topicId) {
  return new Promise((resolve, reject) => {
    fetchTopic(store, topicId).then(
      content => {
        store.commit('SET_TOPIC', content.topic);
        store.commit('SET_SUBTOPICS', content.subtopics);
        store.commit('SET_EXERCISES', content.exercises);
        resolve();
      },
      error => reject(error)
    );
  });
}

// TODO: Optimize
export function goToTopLevel(store) {
  return new Promise((resolve, reject) => {
    const channelPromise = ChannelResource.fetchCollection({
      getParams: {
        available: true,
        has_exercise: true,
      },
    });

    ConditionalPromise.all([channelPromise]).only(
      samePageCheckGenerator(store),
      ([channelsCollection]) => {
        const fetchTopicPromises = channelsCollection.map(channel =>
          fetchTopic(store, channel.root)
        );
        ConditionalPromise.all(fetchTopicPromises).only(
          samePageCheckGenerator(store),
          channelsContent => {
            const subtopics = channelsContent.map(channel => {
              const subtopic = channel.topic;
              subtopic.allExercisesWithinTopic = channel.subtopics.reduce(
                (acc, subtopic) => acc.concat(subtopic.allExercisesWithinTopic),
                channel.exercises
              );
              return subtopic;
            });

            const topic = {
              allExercisesWithinTopic: subtopics.reduce(
                (acc, subtopic) => acc.concat(subtopic.allExercisesWithinTopic),
                []
              ),
              id: null,
              title: translator.$tr('allChannels'),
            };
            store.commit('SET_TOPIC', topic);
            store.commit('SET_SUBTOPICS', subtopics);
            store.commit('SET_EXERCISES', []);
            resolve();
          },
          error => reject(error)
        );
      },
      error => reject(error)
    );
  });
}
