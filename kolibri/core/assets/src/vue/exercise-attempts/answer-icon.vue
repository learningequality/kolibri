<template>

  <div>
    <mat-svg v-if="answer === 'right'" category="navigation" name="check" class="yes" :class="{ yay: success }"/>
    <mat-svg v-else-if="answer === 'wrong'" category="navigation" name="close" class="no"  :class="{ yay: success }"/>
    <mat-svg v-else-if="answer === 'hint'"  category="action" name="lightbulb_outline"  class="no"  :class="{ yay: success }"/>
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
