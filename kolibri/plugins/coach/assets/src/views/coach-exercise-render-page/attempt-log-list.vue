<template>

  <div class="attempt-log-list">
    <h3 class="header">{{ $tr('header') }}</h3>

    <ul class="history-list">
      <template v-for="(attemptLog, index) in attemptLogs">
        <!--p v-if="index === 0" class="item">
          TODO modify elapsed-time to do Days only?
          {{ daysElapsedText(attemptLog.daysElapsed) }}
        </p>
        <li v-else-if="attemptLogs[index - 1].daysElapsed != attemptLog.daysElapsed">
          <p class="item">
            {{ daysElapsedText(attemptLog.daysElapsed) }}
          </p>
        </li-->
        <li @click="setSelectedAttemptLogIndex(index)" :class="isSelected(index)" class="clickable">
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
              {{ questionText(attemptLog.id + 1) }}
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
    data: () => ({
      selectedIndex: 0,
    }),
    props: {
      attemptLogs: {
        type: Array,
        required: true,
      },
      value: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    methods: {
      daysElapsedText(daysElapsed) {
        if (daysElapsed > 1) {
          return this.$tr('daysAgo', { daysElapsed });
        } else if (daysElapsed === 1) {
          return this.$tr('yesterday');
        }
        return this.$tr('today');
      },
      questionText(number) {
        return this.$tr('question', { number });
      },
      setSelectedAttemptLogIndex(index) {
        this.selectedIndex = index;
        this.$emit('input', index);
      },
      isSelected(index) {
        return this.selectedIndex === index;
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
