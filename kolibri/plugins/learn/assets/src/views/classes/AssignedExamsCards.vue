<template>

  <div>
    <div class="header">
      <h2>
        {{ $tr('examsHeader') }}
      </h2>
      <p v-if="!visibleExams.length">
        {{ $tr('noExamsMessage') }}
      </p>
    </div>
    <ContentCard
      v-for="exam in visibleExams"
      :key="exam.id"
      class="content-card"
      :link="genExamLink(exam)"
      :showContentIcon="false"
      :title="exam.title"
      :subtitle="genExamSubtitle(exam) "
      :kind="EXAM"
      :isMobile="isMobile"
      :progress="getExamProgress(exam)"
    />
  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { canViewExam } from '../../utils/exams';
  import ContentCard from '../ContentCard';
  import { examViewerLink, examReportViewerLink } from './classPageLinks';

  export default {
    name: 'AssignedExamsCards',
    components: {
      ContentCard,
    },
    mixins: [commonCoreStrings],
    props: {
      exams: {
        type: Array,
        required: true,
      },
      isMobile: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      EXAM: () => ContentNodeKinds.EXAM,
      visibleExams() {
        return this.exams.filter(exam => {
          let showIfActive = true;
          if (exam.archive) {
            // Closed (archived) exams only show if the learner started/submitted
            showIfActive = this.examStarted(exam) || this.examSubmitted(exam);
          }
          return showIfActive && exam.active;
        });
      },
    },
    methods: {
      examStarted(exam) {
        return exam.progress.started;
      },
      examSubmitted(exam) {
        return exam.progress.closed === true;
      },
      examStartedNotSubmitted(exam) {
        return this.examStarted(exam) && !this.examSubmitted(exam);
      },
      getExamProgress(exam) {
        if (this.examSubmitted(exam)) {
          return 1;
        } else if (!this.examStarted(exam)) {
          return 0;
        } else if (this.examStartedNotSubmitted(exam)) {
          // so it shows as started
          if (exam.progress.answer_count === 0) {
            return 0.01;
          }
          // So it is not shown as completed
          else if (exam.progress.answer_count === exam.question_count) {
            return 0.99;
          }
          return exam.progress.answer_count / exam.question_count;
        }
      },
      genExamSubtitle(exam) {
        if (this.examSubmitted(exam)) {
          return this.$tr('completedPercentLabel', {
            score: this.examScore(exam.progress.score, exam.question_count),
          });
        } else if (!this.examStarted(exam)) {
          return this.$tr('notStartedLabel');
        } else if (this.examStartedNotSubmitted(exam)) {
          return this.$tr('questionsLeft', {
            questionsLeft: exam.question_count - exam.progress.answer_count,
          });
        }
      },
      genExamLink(exam) {
        if (canViewExam(exam, exam.progress)) {
          return examViewerLink(exam.id);
        }
        return examReportViewerLink(exam.id);
      },
      examScore(correct, total) {
        if (correct === 0 || correct === null) {
          return '0';
        } else {
          return Math.round((correct / total) * 100) + '';
        }
      },
    },
    $trs: {
      examsHeader: 'Quizzes',
      noExamsMessage: 'You have no quizzes assigned',
      notStartedLabel: 'Not started',
      questionsLeft:
        '{questionsLeft, number, integer} {questionsLeft, plural, one {question} other {questions}} left',
      completedPercentLabel: {
        message: 'Completed: {score}%',
        context: 'A label shown to learners on a quiz card when the quiz is completed',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content-card {
    margin-right: 16px;
    margin-bottom: 16px;
  }

</style>
