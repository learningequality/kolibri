<template>

  <BaseCard
    v-if="quiz"
    v-bind="{ to, title, collectionTitle, completedLabel, inProgressLabel, reportVisible }"
  >
    <template
      v-if="showThumbnail"
      #topLeft
    >
      <QuizThumbnail rounded />
    </template>
  </BaseCard>

</template>


<script>

  import QuizThumbnail from '../../thumbnails/QuizThumbnail';
  import BaseCard from '../BaseCard';

  export default {
    name: 'QuizCard',
    components: {
      BaseCard,
      QuizThumbnail,
    },
    props: {
      quiz: {
        type: Object,
        required: true,
      },
      /**
       * vue-router link object
       */
      to: {
        type: Object,
        required: true,
      },
      collectionTitle: {
        type: String,
        required: false,
        default: '',
      },
      showThumbnail: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    computed: {
      progress() {
        return this.quiz ? this.quiz.progress : undefined;
      },
      title() {
        return this.quiz ? this.quiz.title : '';
      },
      inProgressLabel() {
        if (!this.progress) {
          return '';
        }
        const { started, closed, answer_count } = this.progress;
        const { question_count } = this.quiz;
        if (started && !closed) {
          return this.$tr('questionsLeft', {
            questionsLeft: Math.max(0, question_count - answer_count),
          });
        }
        return '';
      },
      completedLabel() {
        if (!this.progress) {
          return '';
        }
        const { score, closed } = this.progress;
        const { question_count } = this.quiz;
        if (closed) {
          let percentage = 0;
          const nCorrect = Number(score);
          if (nCorrect > 0) {
            percentage = Math.round(100 * (nCorrect / question_count));
          }
          return this.$tr('completedPercentLabel', { score: percentage });
        }
        return '';
      },
      reportVisible() {
        const { instant_report_visibility, archive } = this.quiz;
        // Show report if instant_report_visibility is true or null, if the quiz is closed
        return instant_report_visibility !== false || archive;
      },
    },
    $trs: {
      questionsLeft: {
        message:
          '{questionsLeft, number, integer} {questionsLeft, plural, one {question} other {questions}} left',
        context: 'Indicates how many questions the learner has left to complete.',
      },
      completedPercentLabel: {
        message: 'Score: {score, number, integer}%',
        context: 'A label shown to learners on a quiz card when the quiz is completed',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
