<template>

  <span>
    <mat-svg
      v-if="noAttempt"
      category="navigation"
      name="cancel"
      :title="$tr('noAttempt')"
    />
    <mat-svg
      v-if="incorrect"
      category="navigation"
      name="cancel"
      :title="$tr('incorrect')"
    />
    <mat-svg
      v-if="correct"
      category="action"
      name="check_circle"
      :title="$tr('correct')"
    />
    <mat-svg
      v-if="error"
      category="alert"
      name="error_outline"
      :title="$tr('error')"
    />
    <mat-svg
      v-if="hint"
      category="action"
      name="lightbulb_outline"
      :title="$tr('hint')"
    />
  </span>

</template>


<script>

  const NO_ATTEMPT = 'noAttempt';
  const CORRECT = 'correct';
  const INCORRECT = 'incorrect';
  const HINT = 'hint';
  const ERROR = 'error';

  const types = [NO_ATTEMPT, CORRECT, INCORRECT, HINT, ERROR];

  export default {
    name: 'Answer',
    components: {},
    props: {
      type: {
        type: String,
        required: true,
        validator(value) {
          return types.includes(value);
        },
      },
    },
    computed: {
      noAttempt() {
        return this.type === NO_ATTEMPT;
      },
      correct() {
        return this.type === CORRECT;
      },
      incorrect() {
        return this.type === INCORRECT;
      },
      hint() {
        return this.type === HINT;
      },
      error() {
        return this.type === ERROR;
      },
    },
    $trs: {
      noAttempt: 'Learner made no attempts',
      correct: 'Correct answer given',
      incorrect: 'Incorrect answer given',
      hint: 'Learner asked for a hint',
      error: 'An unknown error occurred',
    },
  };

</script>


<style lang="scss" scoped></style>
