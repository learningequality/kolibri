<template>

  <div>
    <svg      v-if="answer === 'right'" src="./icons/right.svg" class="yes" :class="{ yay: success }"/>
    <svg v-else-if="answer === 'wrong'" src="./icons/wrong.svg" class="no"  :class="{ yay: success }"/>
    <svg v-else-if="answer === 'hint'"  src="./icons/hint.svg"  class="no"  :class="{ yay: success }"/>
  </div>

</template>


<script>

  module.exports = {
    props: {
      answer: {
        type: String,
        required: true,
        validator(val) {
          return ['right', 'wrong', 'hint'].includes(val);
        },
      },
      // Visually indicate that the user has succeeded
      success: {
        type: Boolean,
        required: true,
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
