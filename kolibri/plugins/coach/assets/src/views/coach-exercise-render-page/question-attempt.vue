<template>

  <div class="question-attempt">
    <h3 class="header left-pad">{{ attemptsText(questionNumber) }}</h3>
    <p class="left-pad">{{ currAnswerText(selectedIndex + 1) }}</p>
    <div class="box-container left-pad">
      <template v-for="(interaction, index) in interaction_history">
        <attempt-box
          class="box"
          @click.native="setSelected(index)"
          :selected="isSelected(index)"
          :interaction="interaction"/>
      </template>
    </div>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'coachExerciseQuestionAttempt',
    $trs: {
      attempts: 'Question {number} attempts',
      currAnswer: '{number} answer',
    },
    components: {
      'attempt-box': require('./attempt-box'),
    },
    props: {
      questionNumber: {
        type: Number,
        required: true,
      },
    },
    data: () => ({
      selectedIndex: 0,
    }),
    methods: {
      attemptsText(number) {
        return this.$tr('attempts', { number });
      },
      currAnswerText(number) {
        return this.$tr('currAnswer', { number });
      },
      setSelected(index) {
        this.selectedIndex = index;
      },
      isSelected(index) {
        return this.selectedIndex === index;
      },
    },
    vuex: {
      getters: {
        // fake data for testing
        interaction_history: () => [
          {
            correct: 1,
            hinted: false,
          },
          {
            correct: 0,
            hinted: false,
          },
          {
            correct: 0,
            hinted: true,
          },
          {
            correct: 1,
            hinted: false,
          },
          {
            correct: 0,
            hinted: false,
          },
          {
            correct: 0,
            hinted: true,
          },
          {
            correct: 1,
            hinted: false,
          },
          {
            correct: 0,
            hinted: false,
          },
          {
            correct: 0,
            hinted: true,
          },
          {
            correct: 1,
            hinted: false,
          },
          {
            correct: 0,
            hinted: false,
          },
          {
            correct: 0,
            hinted: true,
          },
        ],
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .question-attempt
    background-color: $core-bg-light
    height: 150px

  .header
    margin-top: 0
    padding-top: 10px

  .box-container
    margin-top: 4px
    display: flex
    overflow-x: auto

  .left-pad
    padding-left: 20px

  .box
    float: left
    margin-right: 10px
    cursor: pointer

</style>
