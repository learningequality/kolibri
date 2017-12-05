import {
  ChannelResource,
  LearnerGroupResource,
  ContentNodeResource,
  ExamResource,
  ExamAssignmentResource,
  ExamLogResource,
  FacilityUserResource,
  ExamAttemptLogResource,
} from 'kolibri.resources';
import pick from 'lodash/fp/pick';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import * as CoreActions from 'kolibri.coreVue.vuex.actions';
import { ContentNodeKinds, CollectionKinds } from 'kolibri.coreVue.vuex.constants';
import { PageNames } from '../../constants';
import { EXAM_MODIFICATION_SNACKBAR } from '../../examConstants';
import { setClassState } from './main';
import { createQuestionList, selectQuestionFromExercise } from 'kolibri.utils.exams';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { createTranslator } from 'kolibri.utils.i18n';

const name = 'coachExamPageTitles';

const messages = {
  coachExamListPageTitle: 'Exams',
  coachExamCreationPageTitle: 'Create new exam',
  coachExamReportPageTitle: 'Exam Report',
  coachExamReportDetailPageTitle: 'Exam Report Detail',
};

const translator = createTranslator(name, messages);

const pickIdAndName = pick(['id', 'name']);

function _channelState(channel) {
  return {
    id: channel.id,
    name: channel.name,
    rootPk: channel.root,
  };
}

function _channelsState(channels) {
  return channels.map(channel => _channelState(channel));
}

function _breadcrumbState(topic) {
  return {
    id: topic.pk,
    title: topic.title,
  };
}

function _breadcrumbsState(topics) {
  return topics.map(topic => _breadcrumbState(topic));
}

function _currentTopicState(topic, ancestors = []) {
  let breadcrumbs = Array.from(ancestors);
  breadcrumbs.push({ pk: topic.pk, title: topic.title });
  breadcrumbs = _breadcrumbsState(breadcrumbs);
  return {
    id: topic.pk,
    title: topic.title,
    breadcrumbs,
  };
}

function _topicState(topic) {
  return {
    id: topic.pk,
    title: topic.title,
  };
}

function _topicsState(topics) {
  return topics.map(topic => _topicState(topic));
}

function _exerciseState(exercise) {
  const numAssessments = assessmentMetaDataState(exercise).assessmentIds.length;
  return {
    id: exercise.pk,
    title: exercise.title,
    numAssessments,
  };
}

function _exercisesState(exercises) {
  return exercises.map(exercise => _exerciseState(exercise));
}

function _assignmentState(assignment) {
  return {
    assignmentId: String(assignment.id),
    collection: {
      id: String(assignment.collection.id),
      name: assignment.collection.name,
      kind: assignment.collection.kind,
    },
    examId: String(assignment.exam),
  };
}

function _assignmentsState(assignments) {
  return assignments.map(assignment => _assignmentState(assignment));
}

function _examState(exam) {
  const assignments = _assignmentsState(exam.assignments);
  const visibility = {};
  visibility.class = assignments.find(
    assignment => assignment.collection.kind === CollectionKinds.CLASSROOM
  );
  visibility.groups = assignments.filter(
    assignment => assignment.collection.kind === CollectionKinds.LEARNERGROUP
  );
  return {
    id: exam.id,
    title: exam.title,
    channelId: exam.channel_id,
    collection: exam.collection,
    active: exam.active,
    archive: exam.archive,
    questionCount: exam.question_count,
    questionSources: exam.question_sources,
    seed: exam.seed,
    visibility,
  };
}

function _examsState(exams) {
  return exams.map(exam => _examState(exam));
}

function displayExamModal(store, modalName) {
  store.dispatch('SET_EXAM_MODAL', modalName);
}

function showExamsPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXAMS);

  const promises = [
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    ChannelResource.getCollection().fetch(),
    ExamResource.getCollection({ collection: classId }).fetch({}, true),
    setClassState(store, classId),
  ];

  return ConditionalPromise.all(promises).only(
    CoreActions.samePageCheckGenerator(store),
    ([learnerGroups, channels, exams]) => {
      const pageState = {
        channels: _channelsState(channels),
        currentClassGroups: learnerGroups.map(pickIdAndName),
        exams: _examsState(exams),
        examModalShown: false,
        busy: false,
      };

      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', translator.$tr('coachExamListPageTitle'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => CoreActions.handleError(store, error)
  );
}

function activateExam(store, examId) {
  ExamResource.getModel(examId)
    .save({ active: true })
    .then(
      () => {
        const exams = store.state.pageState.exams;
        const examIndex = exams.findIndex(exam => exam.id === examId);
        exams[examIndex].active = true;

        store.dispatch('SET_EXAMS', exams);
        displayExamModal(store, false);
      },
      error => CoreActions.handleError(store, error)
    );
}

function deactivateExam(store, examId) {
  ExamResource.getModel(examId)
    .save({ active: false })
    .then(
      () => {
        const exams = store.state.pageState.exams;
        const examIndex = exams.findIndex(exam => exam.id === examId);
        exams[examIndex].active = false;

        store.dispatch('SET_EXAMS', exams);
        displayExamModal(store, false);
      },
      error => CoreActions.handleError(store, error)
    );
}

function _assignExamTo(examId, collection) {
  const assignmentPayload = {
    exam: examId,
    collection,
  };
  return new Promise((resolve, reject) => {
    ExamAssignmentResource.createModel(assignmentPayload)
      .save()
      .then(assignment => resolve(assignment), error => reject(error));
  });
}

function _removeAssignment(assignmentId) {
  return new Promise((resolve, reject) => {
    ExamAssignmentResource.getModel(assignmentId)
      .delete()
      .then(() => resolve(), error => reject(error));
  });
}

function updateExamAssignments(store, examId, collectionsToAssign, assignmentsToRemove) {
  store.dispatch('SET_BUSY', true);
  const assignPromises = collectionsToAssign.map(collection => _assignExamTo(examId, collection));
  const unassignPromises = assignmentsToRemove.map(assignment => _removeAssignment(assignment));
  const assignmentPromises = assignPromises.concat(unassignPromises);

  ConditionalPromise.all(assignmentPromises).only(
    CoreActions.samePageCheckGenerator(store),
    response => {
      let newAssignments = response.filter(n => n);
      newAssignments = _assignmentsState(newAssignments);

      const classId = store.state.classId;
      const exams = store.state.pageState.exams;
      const examIndex = exams.findIndex(exam => exam.id === examId);
      const examVisibility = exams[examIndex].visibility;

      newAssignments.forEach(assignment => {
        if (assignment.collection.id === classId) {
          examVisibility.class = assignment;
        } else {
          examVisibility.groups.push(assignment);
        }
      });

      assignmentsToRemove.forEach(assignmentId => {
        if (examVisibility.class) {
          if (assignmentId === examVisibility.class.assignmentId) {
            examVisibility.class = null;
            return;
          }
        }
        examVisibility.groups = examVisibility.groups.filter(
          group => group.assignmentId !== assignmentId
        );
      });

      exams[examIndex].visibility = examVisibility;
      store.dispatch('SET_EXAMS', exams);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('SET_BUSY', false);
      displayExamModal(store, false);
    },
    error => {
      store.dispatch('SET_BUSY', false);
      CoreActions.handleError(store, error);
    }
  );
}

function previewExam(store) {
  displayExamModal(store, false);
}

function renameExam(store, examId, newExamTitle) {
  ExamResource.getModel(examId)
    .save({ title: newExamTitle })
    .then(
      () => {
        const exams = store.state.pageState.exams;
        const examIndex = exams.findIndex(exam => exam.id === examId);
        exams[examIndex].title = newExamTitle;

        store.dispatch('SET_EXAMS', exams);
        displayExamModal(store, false);
      },
      error => CoreActions.handleError(store, error)
    );
}

function deleteExam(store, examId) {
  ExamResource.getModel(examId)
    .delete()
    .then(
      () => {
        const exams = store.state.pageState.exams;
        const updatedExams = exams.filter(exam => exam.id !== examId);

        store.dispatch('SET_EXAMS', updatedExams);
        displayExamModal(store, false);
      },
      error => CoreActions.handleError(store, error)
    );
}

function getAllExercisesWithinTopic(store, topicId) {
  return new Promise((resolve, reject) => {
    const exercisesPromise = ContentNodeResource.getDescendantsCollection(topicId, {
      descendant_kind: ContentNodeKinds.EXERCISE,
      fields: ['pk', 'title', 'assessmentmetadata'],
    }).fetch();

    ConditionalPromise.all([exercisesPromise]).only(
      CoreActions.samePageCheckGenerator(store),
      ([exercisesCollection]) => {
        const exercises = _exercisesState(exercisesCollection);
        resolve(exercises);
      },
      error => reject(error)
    );
  });
}

// fetches topic, it's children subtopics, and children exercises
function fetchContent(store, topicId) {
  return new Promise((resolve, reject) => {
    const topicPromise = ContentNodeResource.getModel(topicId).fetch();
    const ancestorsPromise = ContentNodeResource.fetchAncestors(topicId);
    const subtopicsPromise = ContentNodeResource.getCollection({
      parent: topicId,
      kind: ContentNodeKinds.TOPIC,
      fields: ['pk', 'title', 'ancestors'],
    }).fetch();
    const exercisesPromise = ContentNodeResource.getCollection({
      parent: topicId,
      kind: ContentNodeKinds.EXERCISE,
      fields: ['pk', 'title', 'assessmentmetadata'],
    }).fetch();

    ConditionalPromise.all([
      topicPromise,
      subtopicsPromise,
      exercisesPromise,
      ancestorsPromise,
    ]).only(
      CoreActions.samePageCheckGenerator(store),
      ([topicModel, subtopicsCollection, exercisesCollection, ancestors]) => {
        const topic = _currentTopicState(topicModel, ancestors);
        const exercises = _exercisesState(exercisesCollection);
        let subtopics = _topicsState(subtopicsCollection);

        const subtopicsExercisesPromises = subtopics.map(subtopic =>
          getAllExercisesWithinTopic(store, subtopic.id)
        );

        ConditionalPromise.all(subtopicsExercisesPromises).only(
          CoreActions.samePageCheckGenerator(store),
          subtopicsExercises => {
            subtopics = subtopics.map((subtopic, index) => {
              subtopic.allExercisesWithinTopic = subtopicsExercises[index];
              return subtopic;
            });

            store.dispatch('SET_TOPIC', topic);
            store.dispatch('SET_SUBTOPICS', subtopics);
            store.dispatch('SET_EXERCISES', exercises);
            resolve({ topic, subtopics, exercises });
          },
          error => reject(error)
        );
      },
      error => reject(error)
    );
  });
}

function showCreateExamPage(store, classId, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.CREATE_EXAM);
  store.dispatch('CORE_SET_TITLE', translator.$tr('coachExamCreationPageTitle'));

  const channelPromise = ChannelResource.getCollection().fetch();
  const examsPromise = ExamResource.getCollection({
    collection: classId,
  }).fetch({}, true);

  ConditionalPromise.all([channelPromise, examsPromise, setClassState(store, classId)]).only(
    CoreActions.samePageCheckGenerator(store),
    ([channelsCollection, exams]) => {
      const currentChannel = _channelState(
        channelsCollection.find(channel => channel.id === channelId)
      );

      const fetchContentPromise = fetchContent(store, currentChannel.rootPk);
      ConditionalPromise.all([fetchContentPromise]).only(
        CoreActions.samePageCheckGenerator(store),
        ([content]) => {
          const pageState = {
            currentChannel,
            topic: content.topic,
            subtopics: content.subtopics,
            exercises: content.exercises,
            selectedExercises: [],
            examModalShown: false,
            exams: _examsState(exams),
          };

          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
        },
        error => CoreActions.handleError(store, error)
      );
    },
    error => CoreActions.handleError(store, error)
  );
}

function addExercise(store, exercise) {
  const selectedExercises = store.state.pageState.selectedExercises;
  if (!selectedExercises.some(selectedExercise => selectedExercise.id === exercise.id)) {
    store.dispatch('SET_SELECTED_EXERCISES', selectedExercises.concat(exercise));
  }
}

function removeExercise(store, exercise) {
  let selectedExercises = store.state.pageState.selectedExercises;
  selectedExercises = selectedExercises.filter(
    selectedExercise => selectedExercise.id !== exercise.id
  );
  store.dispatch('SET_SELECTED_EXERCISES', selectedExercises);
}

function createExam(store, classCollection, examObj) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const examPayload = {
    collection: examObj.classId,
    channel_id: examObj.channelId,
    title: examObj.title,
    question_count: examObj.numQuestions,
    question_sources: examObj.questionSources,
    seed: examObj.seed,
  };
  ExamResource.createModel(examPayload)
    .save()
    .then(
      exam => {
        _assignExamTo(exam.id, classCollection).then(
          () => {
            store.dispatch('CORE_SET_PAGE_LOADING', false);
            router.getInstance().push({ name: PageNames.EXAMS });
          },
          error => CoreActions.handleError(store, error)
        );
      },
      error => CoreActions.handleError(store, error)
    );
}

function showExamReportPage(store, classId, channelId, examId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXAM_REPORT);
  const examLogPromise = ExamLogResource.getCollection({
    exam: examId,
    collection: classId,
  }).fetch();
  const examPromise = ExamResource.getModel(examId, {
    channel_id: channelId,
  }).fetch();
  const facilityUserPromise = FacilityUserResource.getCollection({
    member_of: classId,
  }).fetch();
  const groupPromise = LearnerGroupResource.getCollection({
    parent: classId,
  }).fetch();
  ConditionalPromise.all([
    examLogPromise,
    facilityUserPromise,
    groupPromise,
    examPromise,
    setClassState(store, classId),
  ]).only(
    CoreActions.samePageCheckGenerator(store),
    ([examLogs, facilityUsers, learnerGroups, exam]) => {
      const examTakers = facilityUsers.map(user => {
        const examTakenByUser = examLogs.find(examLog => String(examLog.user) === user.id) || {};
        const learnerGroup =
          learnerGroups.find(group => group.user_ids.indexOf(user.id) > -1) || {};
        return {
          id: user.id,
          name: user.full_name,
          group: learnerGroup,
          score: examTakenByUser.score,
          progress: examTakenByUser.progress,
          closed: examTakenByUser.closed,
        };
      });
      const pageState = {
        examTakers,
        exam,
        channelId,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', translator.$tr('coachExamReportPageTitle'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      CoreActions.handleApiError(store, error);
    }
  );
}

function showExamReportDetailPage(
  store,
  classId,
  userId,
  channelId,
  examId,
  questionNumber,
  interactionIndex
) {
  if (store.state.pageName !== PageNames.EXAM_REPORT_DETAIL) {
    store.dispatch('CORE_SET_PAGE_LOADING', true);
    store.dispatch('SET_PAGE_NAME', PageNames.EXAM_REPORT_DETAIL);
  }
  const examPromise = ExamResource.getModel(examId, {
    channel_id: channelId,
  }).fetch();
  const examLogPromise = ExamLogResource.getCollection({
    exam: examId,
    user: userId,
  }).fetch();
  const attemptLogPromise = ExamAttemptLogResource.getCollection({
    exam: examId,
    user: userId,
  }).fetch();
  const userPromise = FacilityUserResource.getModel(userId).fetch();
  ConditionalPromise.all([
    attemptLogPromise,
    examPromise,
    userPromise,
    examLogPromise,
    setClassState(store, classId),
  ]).only(
    CoreActions.samePageCheckGenerator(store),
    ([examAttempts, exam, user, examLogs]) => {
      const examLog = examLogs[0] || {};
      const seed = exam.seed;
      const questionSources = exam.question_sources;

      const questionList = createQuestionList(questionSources);

      if (!questionList[questionNumber]) {
        // Illegal question number!
        CoreActions.handleError(
          store,
          `Question number ${questionNumber} is not valid for this exam`
        );
      } else {
        const contentPromise = ContentNodeResource.getCollection({
          ids: questionSources.map(item => item.exercise_id),
        }).fetch();

        contentPromise.only(
          CoreActions.samePageCheckGenerator(store),
          contentNodes => {
            const contentNodeMap = {};

            contentNodes.forEach(node => {
              contentNodeMap[node.pk] = node;
            });

            const questions = questionList.map(question => ({
              itemId: selectQuestionFromExercise(
                question.assessmentItemIndex,
                seed,
                contentNodeMap[question.contentId]
              ),
              contentId: question.contentId,
            }));

            const allQuestions = questions.map((question, index) => {
              const attemptLog = examAttempts.find(
                log => log.item === question.itemId && log.content_id === question.contentId
              ) || {
                interaction_history: '[]',
                correct: false,
                noattempt: true,
              };
              return Object.assign(
                {
                  questionNumber: index + 1,
                },
                attemptLog
              );
            });

            allQuestions.sort((loga, logb) => loga.questionNumber - logb.questionNumber);

            const currentQuestion = questions[questionNumber];
            const itemId = currentQuestion.itemId;
            const exercise = contentNodeMap[currentQuestion.contentId];
            const currentAttempt = allQuestions[questionNumber];
            const currentInteractionHistory = currentAttempt.interaction_history;
            const currentInteraction = currentInteractionHistory[interactionIndex];
            const pageState = {
              exam: _examState(exam),
              itemId,
              questions,
              currentQuestion,
              questionNumber,
              currentAttempt,
              exercise,
              channelId,
              interactionIndex,
              currentInteraction,
              currentInteractionHistory,
              user,
              examAttempts: allQuestions,
              examLog,
            };

            store.dispatch('SET_PAGE_STATE', pageState);
            store.dispatch('CORE_SET_ERROR', null);
            store.dispatch('CORE_SET_TITLE', translator.$tr('coachExamReportDetailPageTitle'));
            store.dispatch('CORE_SET_PAGE_LOADING', false);
          },
          error => CoreActions.handleApiError(store, error)
        );
      }
    },
    error => CoreActions.handleApiError(store, error)
  );
}

function showExamModificationSnackbar(store) {
  store.dispatch('CORE_SET_CURRENT_SNACKBAR', EXAM_MODIFICATION_SNACKBAR);
}

export {
  displayExamModal,
  showExamsPage,
  showCreateExamPage,
  showExamReportPage,
  showExamReportDetailPage,
  activateExam,
  deactivateExam,
  previewExam,
  renameExam,
  deleteExam,
  updateExamAssignments,
  fetchContent,
  createExam,
  addExercise,
  removeExercise,
  getAllExercisesWithinTopic,
  showExamModificationSnackbar,
};
