<template>

  <div class="answer-history">
    <h3 class="header">{{ $tr('header') }}</h3>

    <ul class="history-list">
      <template v-for="(attemptLog, index) in attemptLogs">
        <li v-if="index === 0">
          <p class="item">
            {{ exerciseNameText(attemptLog.contentId) }}
          </p>
        </li>
        <li v-else-if="attemptLogs[index - 1].contentId != attemptLog.contentId">
          <p class="item">
            {{ exerciseNameText(attemptLog.contentId) }}
          </p>
        </li>
        <li @click="setSelected(index)" :class="isSelected(index)" class="clickable">
          <div>
            <mat-svg
              v-if="attemptLog.hinted"
              class="item svg-item svg-hint"
              category="action"
              name="lightbulb_outline"
            />
            <mat-svg
              v-else-if="attemptLog.correct === 0"
              class="item svg-item svg-wrong"
              category="navigation"
              name="cancel"
            />
            <mat-svg
              v-else
              class="item svg-item svg-correct"
              category="action"
              name="check_circle"
            />
            <h3 class="item">
              {{ questionText(attemptLog.index + 1) }}
            </h3>
          </div>
        </li>
      </template>
    </ul>
  </div>

</template>


<script>

  const actions = require('../../state/actions/main');

  module.exports = {
    $trNameSpace: 'coachExamAnswerHistory',
    $trs: {
      header: 'Answer history',
      fromExercise: 'from Exercise { contentId }',
      question: 'Question { number }',
    },
    data: () => ({
      selectedIndex: 0,
    }),
    methods: {
      exerciseNameText(contentId) {
        return this.$tr('fromExercise', { contentId });
      },
      questionText(number) {
        return this.$tr('question', { number });
      },
      setSelected(index) {
        this.selectedIndex = index;
        this.setSelectedAttemptLogIndex(index);
      },
      isSelected(index) {
        if (this.selectedIndex === index) {
          return 'selected';
        }
        return null;
      },
    },
    vuex: {
      getters: {
        attemptLogs: () => [
          {
            contentId: 1,
            index: 0,
            hinted: false,
            correct: 1,
          },
          {
            contentId: 1,
            index: 1,
            hinted: false,
            correct: 1,
          },
          {
            contentId: 2,
            index: 0,
            hinted: false,
            correct: 0,
          },
          {
            contentId: 3,
            index: 0,
            hinted: true,
            correct: 0,
          },
          {
            contentId: 3,
            index: 1,
            hinted: false,
            correct: 1,
          },
          {
            contentId: 3,
            index: 2,
            hinted: false,
            correct: 1,
          },
          {
            contentId: 3,
            index: 3,
            hinted: false,
            correct: 0,
          },
          {
            contentId: 3,
            index: 4,
            hinted: false,
            correct: 1,
          }
        ],
      },
      actions: {
        setSelectedAttemptLogIndex: actions.setSelectedAttemptLogIndex,
      }
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .answer-history
    background-color: $core-bg-light

  .header
    margin: 0
    padding-left: 20px
    padding-top: 10px

  .history-list
    list-style-type: none
    max-height: inherit
    margin: 0
    padding-left: 0

  .item
    display: inline-block
    height: 24px

  .svg-item
    vertical-align: middle
    height: auto
    width: 32px

  .svg-hint
    fill: grey

  .svg-wrong
    fill: red

  .svg-correct
    fill: green

  li
    clear: both
    min-width: 120px
    border-bottom: 2px solid $core-text-disabled
    padding-left: 20px

  .clickable
    cursor: pointer

  .selected
    background-color: $core-text-disabled

</style>
