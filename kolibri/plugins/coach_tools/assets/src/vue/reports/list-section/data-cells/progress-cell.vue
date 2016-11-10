<template>

  <div>
    <progress-bar :progress="num"></progress-bar>
    <div v-if="extraText" class="extra-text">
      <svg src="../../../icons/user.svg" class="person-icon"></svg>
      {{extraText}}
    </div>
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
    props: {
      num: {
        type: Number,
        required: true,
        validator(value) {
          return value >= 0 && value <= 1;
        },
      },
      isexercise: {
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
        if (this.isexercise) {
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
