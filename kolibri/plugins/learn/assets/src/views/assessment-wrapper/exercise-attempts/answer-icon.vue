<template>

  <div>
    <mat-svg v-if="answer === 'right'" category="navigation" name="check" class="yes" />
    <mat-svg v-else-if="answer === 'wrong'" category="navigation" name="close" class="no" />
    <mat-svg v-else-if="answer === 'hint'" category="action" name="lightbulb_outline" class="no" />
  </div>

</template>


<script>

  export default {
    props: {
      answer: {
        type: String,
        required: true,
        validator(val) {
          return ['right', 'wrong', 'hint'].includes(val);
        },
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  svg
    transition: transform $core-time ease-in

  .yes
    fill: $core-status-correct

  .no
    fill: $core-text-annotation

</style>
