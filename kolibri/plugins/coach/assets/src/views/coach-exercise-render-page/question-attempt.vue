<template>

  <div class="question-attempt">
    <h3 class="header left-pad">{{ attemptsText(questionNumber) }}</h3>
    <p class="left-pad">{{ $tr('currAnswer', {ordinal: selectedIndex + 1 }) }}</p>
    <div class="box-container left-pad">
      <mat-svg
        class="pagination-btn"
        @click="previousPage"
        :class="[1 < currPage ? 'enable' : 'disable']"
        category="image"
        name="navigate_before"
      />
      <template v-for="(interaction, index) in currAttemptsShown">
        <attempt-box
          class="box"
          @click.native="setSelected(index)"
          :selected="isSelected(index)"
          :interaction="interaction"/>
      </template>
      <mat-svg
        class="pagination-btn pagination-right"
        @click="nextPage"
        :class="[numAttemptsShown * currPage < interaction_history.length ? 'enable' : 'disable']"
        category="image"
        name="navigate_next"
      />
    </div>
  </div>

</template>


<script>

  const responsiveElement = require('kolibri.coreVue.mixins.responsiveElement');

  module.exports = {
    mixins: [responsiveElement],
    $trNameSpace: 'CoachExerciseQuestionAttempt',
    $trs: {
      attempts: 'Question {number} attempts',
      currAnswer: '{ordinal, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} answer',
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
      currPage: 1,
    }),
    computed: {
      numAttemptsShown() {
        return Math.floor(this.elSize.width / 70) - 2;
      },
      currAttemptsShown() {
        if (this.interaction_history.length <= ((this.currPage - 1) * this.numAttemptsShown)) {
          // when expand, guarantee that no empty page shown.
          this.currPage -= 1;
        }
        return this.interaction_history.slice((this.currPage - 1) * this.numAttemptsShown,
          this.currPage * this.numAttemptsShown);
      },
    },
    methods: {
      attemptsText(number) {
        return this.$tr('attempts', { number });
      },
      setSelected(index) {
        this.selectedIndex = ((this.currPage - 1) * this.numAttemptsShown) + index;
      },
      isSelected(index) {
        return this.selectedIndex === ((this.currPage - 1) * this.numAttemptsShown) + index;
      },
      previousPage() {
        this.currPage -= 1;
      },
      nextPage() {
        this.currPage += 1;
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

  .pagination-btn
    width: 40px
    height: 40px
    margin: 10px

  .pagination-right
    right: 0
    position: absolute

  .enable
    fill: $core-text-default
    cursor: pointer

  .disable
    fill: $core-text-disabled
    pointer-events: none

  .box
    float: left
    margin-right: 10px
    cursor: pointer

</style>
