<template>

  <div class="attempt-log-list">
    <h3 class="header">{{ $tr('header') }}</h3>

    <ul class="history-list">
      <template v-for="attemptLog in attemptLogs">
        <li @click="setSelectedAttemptLogId(attemptLog.id)" :class="{selected: isSelected(attemptLog.id), clickable: true}">
            <mat-svg
              v-if="attemptLog.correct"
              class="item svg-item svg-correct"
              category="action"
              name="check_circle"
            />
            <mat-svg
              v-else-if="!attemptLog.correct"
              class="item svg-item svg-wrong"
              category="navigation"
              name="cancel"
            />
            <mat-svg
              v-if="attemptLog.hinted"
              class="item svg-item svg-hint"
              category="action"
              name="lightbulb_outline"
            />
            <h3 class="item">
              {{ questionText(attemptLog.id)}}
            </h3>
        </li>
      </template>
    </ul>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'coachExerciseAnswerHistory',
    $trs: {
      header: 'Answer history',
      today: 'Today',
      yesterday: 'Yesterday',
      daysAgo: ' { daysElapsed } days ago',
      question: 'Question { number }',
    },
    props: {
      attemptLogs: {
        type: Array,
        required: true,
      },
      selectedAttemptId: {
        required: true,
        default: 0,
      },
    },
    methods: {
      questionText(number) {
        return this.$tr('question', { number });
      },
      setSelectedAttemptLogId(id) {
        this.selectedId = id;
        this.$emit('select', id);
      },
      isSelected(id) {
        return this.selectedAttemptId === id;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .attempt-log-list
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
    display: block

  .clickable
    cursor: pointer
    display: block

  .selected
    background-color: $core-text-disabled

</style>
