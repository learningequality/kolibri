<template>

  <div>
    <svg v-if="isRight" src="./icons/right.svg" class="yes" :class="{ yay: success }"></svg>
    <svg v-if="isWrong" src="./icons/wrong.svg" class="no" :class="{ yay: success }"></svg>
    <svg v-if="isHint" src="./icons/hint.svg" class="no" :class="{ yay: success }"></svg>
  </div>

</template>


<script>

  const AnswerTypes = require('./constants').AnswerTypes;

  module.exports = {
    props: {
      // one of the AnswerTypes
      answertype: {
        type: Number,
        required: true,
      },
      // Visually indicate that the user has succeeded
      success: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      isRight() {
        return this.answertype === AnswerTypes.RIGHT;
      },
      isWrong() {
        return this.answertype === AnswerTypes.WRONG;
      },
      isHint() {
        return this.answertype === AnswerTypes.HINT;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  svg
    transition: transform $core-time ease-in

  .yes
    fill: $core-action-normal

  .yes.yay
    transform: scale(1.5)

  .no
    fill: $core-text-annotation

  .no.yay
    transform: scale(0.75)

</style>
