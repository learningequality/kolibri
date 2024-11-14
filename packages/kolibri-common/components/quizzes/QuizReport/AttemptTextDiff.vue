<template>

  <span
    v-if="text"
    data-testid="attempt-text-diff"
  >{{ text }}</span>

</template>


<script>

  import useUser from 'kolibri/composables/useUser';

  export default {
    name: 'AttemptTextDiff',
    setup() {
      const { currentUserId } = useUser();
      return { currentUserId };
    },
    props: {
      correct: {
        type: Number,
        required: true,
      },
      diff: {
        type: Number,
        required: true,
      },
      userId: {
        type: String,
        required: true,
      },
    },
    computed: {
      isSecondPersonPerspective() {
        return this.userId === this.currentUserId;
      },
      answerLogImprovedLabel() {
        return this.isSecondPersonPerspective
          ? this.$tr('answerLogImprovedLabelSecondPerson')
          : this.$tr('answerLogImprovedLabelThirdPerson');
      },
      answerLogIncorrectLabel() {
        return this.isSecondPersonPerspective
          ? this.$tr('answerLogIncorrectLabelSecondPerson')
          : this.$tr('answerLogIncorrectLabelThirdPerson');
      },
      answerLogCorrectLabel() {
        return this.isSecondPersonPerspective
          ? this.$tr('answerLogCorrectLabelSecondPerson')
          : this.$tr('answerLogCorrectLabelThirdPerson');
      },
      text() {
        // if correct and diff are both 0 or 1
        if (this.correct === this.diff) {
          return this.correct >= 1 ? this.answerLogImprovedLabel : this.answerLogIncorrectLabel;
        } else if (!this.correct && this.diff < 0) {
          return this.answerLogCorrectLabel;
        }
        return null;
      },
    },
    $trs: {
      /* Second-person perspective: "You ..." */
      answerLogCorrectLabelSecondPerson: {
        message: 'You answered this correctly on the previous attempt',
        context:
          'Label that indicates to the learner that they answered this question correctly last time they took the quiz',
      },
      answerLogIncorrectLabelSecondPerson: {
        message: 'You also answered this incorrectly on the previous attempt',
        context:
          'Label that indicates to the learner that they answered this question incorrectly both on this attempt and on the previous one',
      },
      answerLogImprovedLabelSecondPerson: {
        message: 'You improved your incorrect answer from the previous attempt',
        context:
          'Label that indicates to the learner that they got the question wrong on the previous attempt, but got it correctly this time.',
      },
      /* Third-person perspective: "Learner ..." */
      answerLogCorrectLabelThirdPerson: {
        message: 'Learner answered this correctly on the previous attempt',
        context:
          'Label that indicates to the coach that the learner answered this question correctly last time they took the quiz.',
      },
      answerLogIncorrectLabelThirdPerson: {
        message: 'Learner also answered this incorrectly on the previous attempt',
        context:
          'Label that indicates to the coach that the learner answered this question incorrectly both on this attempt and on the previous one',
      },
      answerLogImprovedLabelThirdPerson: {
        message: 'Learner improved their incorrect answer from the previous attempt',
        context:
          'Label that indicates to the coach that the learner got the question wrong on the previous attempt, but got it correctly this time.',
      },
    },
  };

</script>
