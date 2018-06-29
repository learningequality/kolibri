<template>

  <div>
    <div class="header">
      <h2>
        {{ $tr('examsHeader') }}
      </h2>
      <p v-if="exams.length===0">
        {{ $tr('noExamsMessage') }}
      </p>
    </div>
    <content-card
      class="content-card"
      v-for="exam in exams"
      :key="exam.id"
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
  import { canViewExam } from 'kolibri.utils.exams';
  import ContentCard from '../content-card';
  import { examViewerLink, examReportViewerLink } from './classPageLinks';

  export default {
    name: 'assignedExamsCards',
    components: {
      ContentCard,
    },
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
    },
    methods: {
      examStarted(exam) {
        return exam.progress.answer_count > 0;
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
          // So it is not displayed as completed
          return exam.progress.answer_count / exam.question_count - 0.01;
        }
      },
      genExamSubtitle(exam) {
        if (this.examSubmitted(exam)) {
          return this.$tr('completed');
        } else if (!this.examStarted(exam)) {
          return this.$tr('notStarted');
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
    },
    $trs: {
      examsHeader: 'Exams',
      noExamsMessage: 'You have no exams assigned',
      notStarted: 'Not started',
      questionsLeft:
        '{questionsLeft, number, integer} {questionsLeft, plural, one {question} other {questions}} left',
      completed: 'Completed',
    },
  };

</script>


<style lang="stylus" scoped>

  .content-card
    margin-right: 16px
    margin-bottom: 16px

</style>
