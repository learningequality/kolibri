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

  import ContentCard from '../content-card';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
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
      examNotStarted(exam) {
        return exam.progress.answer_count === null;
      },
      examStartedNotCompleted(exam) {
        return exam.progress.answer_count !== null && !exam.progress.closed;
      },
      examCompleted(exam) {
        return exam.progress.closed === true;
      },
      getExamProgress(exam) {
        if (this.examCompleted(exam)) {
          return 1;
        }
        if (this.examStartedNotCompleted(exam)) {
          return exam.progress.answer_count / exam.question_count;
        }
        return 0;
      },
      genExamSubtitle(exam) {
        if (this.examCompleted(exam)) {
          return this.$tr('completed');
        } else if (this.examNotStarted(exam)) {
          return this.$tr('notStarted');
        } else if (this.examStartedNotCompleted(exam)) {
          return this.$tr('questionsLeft', {
            questionsLeft: exam.question_count - exam.progress.answer_count,
          });
        }
        return null;
      },
      genExamLink(exam) {
        if (exam.active && !exam.progress.closed) {
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
