<template>

  <AssignmentCard
    v-bind="{ classroomName, assignmentName, completedLabel, inProgressLabel, to: quizLink }"
  />

</template>


<script>

  import { ClassesPageNames } from '../../constants';
  import AssignmentCard from './AssignmentCard.vue';

  export default {
    name: 'QuizCard',
    components: {
      AssignmentCard,
    },
    props: {
      classroom: {
        type: Object,
        required: true,
      },
      quiz: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        progress: this.quiz.progress || {},
        classroomName: this.classroom.name || '',
        assignmentName: this.quiz.title || '',
      };
    },
    computed: {
      inProgressLabel() {
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
      quizLink() {
        if (this.progress.closed) {
          return {
            name: ClassesPageNames.EXAM_REPORT_VIEWER,
            params: {
              examId: this.quiz.id,
              questionNumber: 0,
              questionInteraction: 0,
            },
          };
        } else {
          return {
            name: ClassesPageNames.EXAM_VIEWER,
            params: {
              examId: this.quiz.id,
              questionNumber: 0,
            },
          };
        }
      },
    },
    $trs: {
      questionsLeft:
        '{questionsLeft, number, integer} {questionsLeft, plural, one {question} other {questions}} left',
      completedPercentLabel: {
        message: 'Score: {score, number, integer}%',
        context: 'A label shown to learners on a quiz card when the quiz is completed',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
