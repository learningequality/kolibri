<template>

  <div>
    <div ref="icon">
      <mat-svg
        v-if="answer === 'right'"
        category="action"
        name="check_circle"
        class="correct"
        :style="{ fill: $themeTokens.correct }"
      />
      <mat-svg
        v-else-if="answer === 'wrong'"
        category="navigation"
        name="close"
        :style="svgFill"
      />
      <mat-svg
        v-else-if="answer === 'hint'"
        category="action"
        name="lightbulb_outline"
        :style="svgFill"
      />
      <mat-svg
        v-else-if="answer === 'rectified'"
        category="image"
        name="lens"
        class="rectified"
        :style="svgFill"
      />
    </div>
    <KTooltip
      reference="icon"
      :refs="$refs"
      placement="right"
    >
      {{ tooltipText }}
    </KTooltip>
  </div>

</template>


<script>

  export default {
    name: 'AnswerIcon',
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
          default:
            return '';
        }
      },
      svgFill() {
        return {
          fill: this.$themeTokens.annotation,
        };
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


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  svg {
    height: 30px;
    transition: transform $core-time ease-in;
  }

  .rectified {
    width: 12px;
  }

</style>
