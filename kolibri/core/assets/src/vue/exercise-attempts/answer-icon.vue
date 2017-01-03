<template>

  <div>
    <svg v-if="isRight && !isHint" src="./icons/right.svg" class="yes" :class="{ yay: success }"/>
    <svg v-if="!isRight && !isHint" src="./icons/wrong.svg" class="no" :class="{ yay: success }"/>
    <svg v-if="isHint" src="./icons/hint.svg" class="no" :class="{ yay: success }"/>
  </div>

</template>


<script>

  module.exports = {
    props: {
      // answer is an object look like { correct: 1, hinted: 0 }
      answer: {
        type: Object,
      },
      // Visually indicate that the user has succeeded
      success: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      isRight() {
        return this.answer.correct;
      },
      isHint() {
        return this.answer.hinted;
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
