<template>

  <div>
    <template v-if="num !== undefined">
      <progress-bar :progress="num"/>
      <div v-if="extraText" class="extra-text">
        <svg src="../../icons/user.svg" class="person-icon"/>
        {{extraText}}
      </div>
    </template>
    <template v-else>–</template>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'progress-indicator',
    $trs: {
      mastered: 'mastered by {0, number, integer} learners',
      completed: 'completed by {0, number, integer} learners',
      pct: '{0, number, percent}',
    },
    components: {
      'progress-bar': require('kolibri.coreVue.components.progressBar'),
    },
    props: {
      num: {
        type: Number,
      },
      isExercise: {
        type: Boolean,
        default: false,
      },
      numusers: {
        type: Number,
      },
    },
    computed: {
      extraText() {
        if (this.numusers === undefined) {
          return null;
        }
        if (this.isExercise) {
          return this.$tr('mastered', this.numusers);
        }
        return this.$tr('completed', this.numusers);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .extra-text
    font-size: smaller

  .person-icon
    position: relative
    top: 8px
    width: 15px

</style>
