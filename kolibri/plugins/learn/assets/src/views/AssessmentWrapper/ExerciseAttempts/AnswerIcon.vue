<template>

  <div>
    <div ref="icon">
      <KIcon
        v-if="answer === 'right'"
        icon="correct"
        class="correct"
        :color="$themeTokens.correct"
        style="top: 0; width: 24px; height: 24px;"
      />
      <KIcon
        v-else-if="answer === 'wrong'"
        icon="incorrect"
        style="top: 0; width: 24px; height: 24px;"
        :color="$themeTokens.annotation"
      />
      <KIcon
        v-else-if="answer === 'hint'"
        icon="hint"
        style="top: 0; width: 24px; height: 24px;"
        :color="$themeTokens.annotation"
      />
      <KIcon
        v-else-if="answer === 'rectified'"
        icon="rectified"
        class="rectified"
        :color="$themeTokens.annotation"
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

  @import '~kolibri-design-system/lib/styles/definitions';

  svg {
    height: 30px;
    transition: transform $core-time ease-in;
  }

  .rectified {
    width: 12px;
  }

</style>
