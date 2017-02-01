<template>

  <div>
    <svg v-if="answer === 'right'" icon-name="material-navigation-check" class="yes" :class="{ yay: success }"/>
    <svg v-else-if="answer === 'wrong'" icon-name="material-navigation-close" class="no"  :class="{ yay: success }"/>
    <svg v-else-if="answer === 'hint'"  icon-name="material-action-lightbulb_outline"  class="no"  :class="{ yay: success }"/>
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
