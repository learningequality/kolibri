<template>

  <div>
    <div ref="icon">
      <mat-svg
        v-if="answer === 'right'"
        category="action"
        name="check_circle"
        class="correct"
      />
      <mat-svg
        v-else-if="answer === 'wrong'"
        category="navigation"
        name="close"
      />
      <mat-svg
        v-else-if="answer === 'hint'"
        category="action"
        name="lightbulb_outline"
      />
      <mat-svg
        v-else-if="answer === 'rectified'"
        category="image"
        name="lens"
        class="rectified"
      />
    </div>
    <ui-tooltip trigger="icon">
      {{ tooltipText }}
    </ui-tooltip>
  </div>

</template>


<script>

  import UiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'answerIcon',
    components: {
      UiTooltip,
    },
    props: {
      answer: {
        type: String,
        required: true,
        validator(val) {
          return ['right', 'wrong', 'hint', 'rectified'].includes(val);
        },
      },
    },
    computed: {
      tooltipText() {
        switch (this.answer) {
          case 'right':
            return this.$tr('correct');
          case 'wrong':
            return this.$tr('incorrect');
          case 'hint':
            return this.$tr('hintUsed');
          case 'rectified':
            return this.$tr('incorrectFirstTry');
        }
      },
    },
    $trs: {
      correct: 'Correct',
      incorrect: 'Incorrect',
      hintUsed: 'Hint used',
      incorrectFirstTry: 'Incorrect first try',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  svg
    transition: transform $core-time ease-in
    fill: $core-text-annotation
    height: 30px

  .correct
    fill: $core-status-correct

  .rectified
    width: 12px

</style>
