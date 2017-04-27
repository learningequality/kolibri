const CoreApp = require('kolibri');
const pick = require('lodash/fp/pick');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const router = require('kolibri.coreVue.router');
const CoreActions = require('kolibri.coreVue.vuex.actions');
const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;
const CollectionKinds = require('kolibri.coreVue.vuex.constants').CollectionKinds;
const Constants = require('../../constants');
const { setClassState } = require('./main');
const { createQuestionList, selectQuestionFromExercise } = require('kolibri.utils.exams');
const { assessmentMetaDataState } = require('kolibri.coreVue.vuex.mappers');

const ChannelResource = CoreApp.resources.ChannelResource;
const LearnerGroupResource = CoreApp.resources.LearnerGroupResource;
const ContentNodeResource = CoreApp.resources.ContentNodeResource;
const ExamResource = CoreApp.resources.ExamResource;
const ExamAssignmentResource = CoreApp.resources.ExamAssignmentResource;
const ExamLogResource = CoreApp.resources.ExamLogResource;
const FacilityUserResource = CoreApp.resources.FacilityUserResource;
const ExamAttemptLogResource = CoreApp.resources.ExamAttemptLogResource;

const pickIdAndName = pick(['id', 'name']);

function _channelState(channel) {
  return {
    id: channel.id,
    name: channel.name,
    rootPk: channel.root_pk,
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

function _currentTopicState(topic) {
  let breadcrumbs = Array.from(topic.ancestors);
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
    assignment => assignment.collection.kind === CollectionKinds.CLASSROOM);
  visibility.groups = assignments.filter(
    assignment => assignment.collection.kind === CollectionKinds.LEARNERGROUP);
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
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.EXAMS);

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
      };

      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', Constants.PageTitles.EXAMS);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => CoreActions.handleError(store, error)
  );
}

function activateExam(store, examId) {
  ExamResource.getModel(examId).save({ active: true }).then(
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
  ExamResource.getModel(examId).save({ active: false }).then(
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
    ExamAssignmentResource.createModel(assignmentPayload).save().then(
      assignment => resolve(assignment),
      error => reject(error)
    );
  });
}

function _removeAssignment(assignmentId) {
  return new Promise((resolve, reject) => {
    ExamAssignmentResource.getModel(assignmentId).delete().then(
      () => resolve(),
      error => reject(error)
    );
  });
}

function updateExamAssignments(store, examId, collectionsToAssign, assignmentsToRemove) {
  const assignPromises = collectionsToAssign.map(collection => _assignExamTo(examId, collection));
  const unassignPromises = assignmentsToRemove.map(assignment => _removeAssignment(assignment));
  const assignmentPromises = assignPromises.concat(unassignPromises);

  ConditionalPromise.all(assignmentPromises).only(CoreActions.samePageCheckGenerator(store),
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
          group => group.assignmentId !== assignmentId);
      });

      exams[examIndex].visibility = examVisibility;
      store.dispatch('SET_EXAMS', exams);
      store.dispatch('CORE_SET_ERROR', null);
      displayExamModal(store, false);
    },
    error => CoreActions.handleError(store, error)
  );
}

function previewExam(store) {
  displayExamModal(store, false);
}

function renameExam(store, examId, newExamTitle) {
  ExamResource.getModel(examId).save({ title: newExamTitle }).then(
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
  ExamResource.getModel(examId).delete().then(
    () => {
      const exams = store.state.pageState.exams;
      const updatedExams = exams.filter(exam => exam.id !== examId);

      store.dispatch('SET_EXAMS', updatedExams);
      displayExamModal(store, false);
    },
    error => CoreActions.handleError(store, error)
  );
}

function getAllExercisesWithinTopic(store, channelId, topicId) {
  return new Promise((resolve, reject) => {
    const exercisesPromise = ContentNodeResource.getDescendantsCollection(
      topicId,
      { channel_id: channelId },
      { descendant_kind: ContentNodeKinds.EXERCISE, fields: ['pk', 'title', 'assessmentmetadata'] }
    ).fetch();

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
function fetchContent(store, channelId, topicId) {
  return new Promise((resolve, reject) => {
    const channelPayload = { channel_id: channelId };
    const topicPromise = ContentNodeResource.getModel(topicId, channelPayload).fetch();
    const subtopicsPromise = ContentNodeResource.getCollection(
      channelPayload, { parent: topicId, kind: ContentNodeKinds.TOPIC, fields: ['pk', 'title', 'ancestors'] }).fetch();
    const exercisesPromise = ContentNodeResource.getCollection(
      channelPayload, { parent: topicId, kind: ContentNodeKinds.EXERCISE, fields: ['pk', 'title', 'assessmentmetadata'] }).fetch();

    ConditionalPromise.all([topicPromise, subtopicsPromise, exercisesPromise]).only(
      CoreActions.samePageCheckGenerator(store),
      ([topicModel, subtopicsCollection, exercisesCollection]) => {
        const topic = _currentTopicState(topicModel);
        const exercises = _exercisesState(exercisesCollection);
        let subtopics = _topicsState(subtopicsCollection);

        const subtopicsExercisesPromises = subtopics.map(
          subtopic => getAllExercisesWithinTopic(store, channelId, subtopic.id));

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
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.CREATE_EXAM);
  store.dispatch('CORE_SET_TITLE', Constants.PageTitles.CREATE_EXAM);

  const channelPromise = ChannelResource.getCollection().fetch();
  const examsPromise = ExamResource.getCollection({ collection: classId }).fetch({}, true);

  ConditionalPromise.all([channelPromise, examsPromise, setClassState(store, classId)]).only(
    CoreActions.samePageCheckGenerator(store),
    ([channelsCollection, exams]) => {
      const currentChannel = _channelState(
        channelsCollection.find(channel => channel.id === channelId));

      const fetchContentPromise = fetchContent(store, channelId, currentChannel.rootPk);
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
    selectedExercise => selectedExercise.id !== exercise.id);
  store.dispatch('SET_SELECTED_EXERCISES', selectedExercises);
}

function createExam(store, classCollection, examObj) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const examPayload = {
    collection: examObj.classId,
    channel_id: examObj.channelId,
    title: examObj.title,
    question_count: examObj.numQuestions,
    question_sources: JSON.stringify(examObj.questionSources),
    seed: examObj.seed,
  };
  ExamResource.createModel(examPayload).save().then(
    exam => {
      _assignExamTo(exam.id, classCollection).then(
        () => {
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          router.getInstance().push({ name: Constants.PageNames.EXAMS });
        },
        error => CoreActions.handleError(store, error)
      );
    },
    error => CoreActions.handleError(store, error)
  );
}

function showExamReportPage(store, classId, channelId, examId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.EXAM_REPORT);
  const examLogPromise = ExamLogResource.getCollection({
    exam: examId,
    collection: classId,
  }).fetch();
  const examPromise = ExamResource.getModel(examId, { channel_id: channelId }).fetch();
  const facilityUserPromise = FacilityUserResource.getCollection({ member_of: classId }).fetch();
  const groupPromise = LearnerGroupResource.getCollection({ parent: classId }).fetch();
  ConditionalPromise.all([
    examLogPromise,
    facilityUserPromise,
    groupPromise,
    examPromise,
    setClassState(store, classId),
  ]).only(
    CoreActions.samePageCheckGenerator(store),
    ([examLogs, facilityUsers, learnerGroups, exam]) => {
      const examTakers = facilityUsers.map(
      user => {
        const examTakenByUser = examLogs.find(examLog => String(examLog.user) === user.id) || {};
        const learnerGroup = learnerGroups.find(
          group => group.user_ids.indexOf(user.id) > -1) || {};
        return {
          id: user.id,
          name: user.full_name,
          group: learnerGroup,
          score: examTakenByUser.score,
          progress: examTakenByUser.progress,
        };
      });
      const pageState = {
        examTakers,
        exam,
        channelId,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', 'Exam Report');
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => { CoreActions.handleApiError(store, error); }
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
  if (store.state.pageName !== Constants.PageNames.EXAM_REPORT_DETAIL) {
    store.dispatch('CORE_SET_PAGE_LOADING', true);
    store.dispatch('SET_PAGE_NAME', Constants.PageNames.EXAM_REPORT_DETAIL);
  }
  const examPromise = ExamResource.getModel(examId, { channel_id: channelId }).fetch();
  const examLogPromise = ExamLogResource.getCollection({ exam: examId, user: userId }).fetch();
  const attemptLogPromise = ExamAttemptLogResource.getCollection(
    { exam: examId, user: userId }).fetch();
  const userPromise = FacilityUserResource.getModel(userId).fetch();
  ConditionalPromise.all([
    attemptLogPromise,
    examPromise,
    userPromise,
    examLogPromise,
    setClassState(store, classId)
  ]).only(
    CoreActions.samePageCheckGenerator(store),
    ([examAttempts, exam, user, examLogs]) => {
      const examLog = examLogs[0];
      const seed = exam.seed;
      const questionSources = JSON.parse(exam.question_sources);

      const questionList = createQuestionList(questionSources);

      if (!questionList[questionNumber]) {
        // Illegal question number!
        CoreActions.handleError(store, `Question number ${questionNumber} is not valid for this exam`);
      } else {
        const contentPromise = ContentNodeResource.getCollection(
          { channel_id: channelId },
          { ids: questionSources.map(item => item.exercise_id) }).fetch();

        contentPromise.only(
          CoreActions.samePageCheckGenerator(store),
          (contentNodes) => {
            const contentNodeMap = {};

            contentNodes.forEach(node => { contentNodeMap[node.pk] = node; });

            const questions = questionList.map(question => ({
              itemId: selectQuestionFromExercise(
              question.assessmentItemIndex,
              seed,
              contentNodeMap[question.contentId]),
              contentId: question.contentId
            }));

            const allQuestions = questions.map(
              (question, index) => {
                const attemptLog = examAttempts.find(
                  log => log.item === question.itemId &&
                  log.content_id === question.contentId) || {
                    interaction_history: '[]',
                    correct: false,
                  };
                return Object.assign({
                  questionNumber: index + 1,
                }, attemptLog);
              }
            );

            allQuestions.sort((loga, logb) => loga.questionNumber - logb.questionNumber);

            const currentQuestion = questions[questionNumber];
            const itemId = currentQuestion.itemId;
            const exercise = contentNodeMap[currentQuestion.contentId];
            const currentAttempt = allQuestions[questionNumber];
            const currentInteractionHistory = JSON.parse(currentAttempt.interaction_history);
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
            store.dispatch('CORE_SET_TITLE', ('Exam Report Detail'));
            store.dispatch('CORE_SET_PAGE_LOADING', false);
          },
          error => CoreActions.handleApiError(store, error)
        );
      }
    },
    error => CoreActions.handleApiError(store, error)
  );
}

module.exports = {
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
};
