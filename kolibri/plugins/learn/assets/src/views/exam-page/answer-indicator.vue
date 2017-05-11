<template>

  <li :class="selected ? 'selected' : null">
    <svg class="item svg-item">
      <circle cx="32" cy="32" r="8"
        :style="{ fill: hasAnswer ? 'purple' : 'lightgrey' }"/>
    </svg>
    <p class="item">
      {{ questionText(questionNumber + 1) }}
    </p>
  </li>

</template>


<script>

  module.exports = {
    $trNameSpace: 'examAnswerHistory',
    $trs: {
      question: 'Question { num }',
    },
    props: {
      questionNumber: {
        type: Number,
        required: true,
      },
      answer: {
        type: Object,
      },
      selected: {
        type: Boolean,
        required: true,
      },
    },
    methods: {
      questionText(num) {
        return this.$tr('question', { num });
      },
    },
    computed: {
      hasAnswer() {
        console.log(this.answer);
        return Boolean(this.answer);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .item
    float: left
    margin: 0
    line-height: 64px
    font-size: 0.9em

  .svg-item
    height: 64px
    width: 64px

  li
    clear: both
    border: none
    height: 64px

  .selected
    background-color: #EDEDED

</style>
