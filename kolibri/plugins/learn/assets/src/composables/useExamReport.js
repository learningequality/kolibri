import { ref, computed, reactive, provide, inject } from 'vue';
import { getExamReport } from 'kolibri-common/quizzes/utils';
import router from 'kolibri/router';
import { ClassesPageNames, PageNames } from '../constants';
import useLearnerResources from './useLearnerResources';

// Keys for provide/inject
const EXAM_REPORT_KEY = Symbol('examReport');

export function provideExamReport() {
  const instance = useExamReportImplementation();
  provide(EXAM_REPORT_KEY, instance);
  return instance;
}

export function useExamReport() {
  return inject(EXAM_REPORT_KEY) || useExamReportImplementation();
}

function useExamReportImplementation() {
  // State refs
  const exam = ref(null);
  const pageName = ref('');
  const pageLoading = ref(false);
  const exercise = ref(null);
  const exerciseContentNodes = ref([]);
  const questionNumber = ref(0);
  const interactionIndex = ref(0);
  const tryIndex = ref(0);
  const questions = ref([]);
  const error = ref(null);

  // Computed properties
  const classId = computed(() => exam.value?.collection);

  // Get exam visibility status
  const { activeClassesQuizzes } = useLearnerResources();
  const isReportVisible = computed(() => {
    if (!exam.value) return false;

    const quiz = activeClassesQuizzes.value.find(q => q.id === exam.value.id) || exam.value;
    return quiz.instant_report_visibility !== false || quiz.archive;
  });

  const isLoading = computed(() => pageLoading.value);

  // Methods that replace Vuex mutations
  const setPageLoading = loading => {
    pageLoading.value = loading;
  };

  const setPageName = name => {
    pageName.value = name;
  };

  const setError = err => {
    error.value = err;
  };

  // Check if current exam report exists in state
  function hasExamReport(examId, tryIdx, questionNum, interactionIdx) {
    return (
      exam.value &&
      exam.value.id === examId &&
      tryIndex.value === Number(tryIdx) &&
      questionNumber.value === Number(questionNum) &&
      interactionIndex.value === Number(interactionIdx) &&
      exerciseContentNodes.value.length > 0
    );
  }

  // Get exam report from current state - equivalent to getExamReportFromState in handlers.js
  function getExamReportFromState(params) {
    const { examId, questionNum, tryIdx, interactionIdx } = params;

    if (!exam.value || exam.value.id !== examId) {
      return null;
    }

    const exerciseNode = exerciseContentNodes.value.find(
      node => node.id === questions.value[questionNum]?.exercise_id,
    );

    if (!exerciseNode) {
      return null;
    }

    return {
      exam: exam.value,
      exercise: exerciseNode,
      questions: questions.value,
      exerciseContentNodes: exerciseContentNodes.value,
      tryIndex: Number(tryIdx),
      questionNumber: Number(questionNum),
      interactionIndex: Number(interactionIdx),
    };
  }

  // Show exam report -
  async function showExamReport(params) {
    const { classId, examId, tryIndex: tryIdx, questionNumber: qNum, questionInteraction } = params;

    setPageName(ClassesPageNames.EXAM_REPORT_VIEWER);

    const examReportFromState = getExamReportFromState({
      examId,
      questionNum: qNum || 0,
      tryIdx: tryIdx || 0,
      interactionIdx: questionInteraction || 0,
    });

    if (examReportFromState) {
      // Just update state with what we have
      exam.value = examReportFromState.exam;
      exercise.value = examReportFromState.exercise;
      questions.value = examReportFromState.questions;
      exerciseContentNodes.value = examReportFromState.exerciseContentNodes;
      tryIndex.value = examReportFromState.tryIndex;
      questionNumber.value = examReportFromState.questionNumber;
      interactionIndex.value = examReportFromState.interactionIndex;

      setError(null);
      return;
    }

    setPageLoading(true);

    try {
      await fetchExamReport(examId, tryIdx, qNum, questionInteraction);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setPageLoading(false);
    }
  }

  // Fetch exam report
  async function fetchExamReport(examId, tryIdx = 0, questionNum = 0, interactionIdx = 0) {
    // If we already have this report loaded, don't reload
    if (hasExamReport(examId, tryIdx, questionNum, interactionIdx)) {
      return true;
    }

    const report = await getExamReport(examId, tryIdx, questionNum, interactionIdx);
    // Update state
    exam.value = report.exam;
    exercise.value = report.exercise;
    exerciseContentNodes.value = report.exerciseContentNodes;
    questionNumber.value = Number(questionNum);
    interactionIndex.value = Number(interactionIdx);
    tryIndex.value = Number(tryIdx);
    questions.value = report.questions;
    return report;
  }

  // Handle no complete tries scenario
  function handleNoCompleteTries() {
    if (!classId.value) return;

    router.replace({
      name: ClassesPageNames.CLASS_ASSIGNMENTS,
      params: { classId: classId.value },
    });
  }

  // Home page link
  const homePageLink = computed(() => ({
    name: PageNames.HOME,
  }));

  return {
    // State
    exam,
    exercise,
    exerciseContentNodes,
    questionNumber,
    interactionIndex,
    tryIndex,
    questions,
    classId,
    isLoading,
    error,
    isReportVisible,
    homePageLink,
    showQuizReportComingSoonModal: computed(() => !isReportVisible.value && !isLoading.value),

    // Core state management
    setPageLoading,
    setPageName,
    setError,

    // Methods
    showExamReport,
    fetchExamReport,
    handleNoCompleteTries,
  };
}
