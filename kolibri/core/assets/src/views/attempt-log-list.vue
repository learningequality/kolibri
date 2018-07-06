<template>

  <div class="attempt-log-list">
    <h3 class="header">{{ $tr('header') }}</h3>

    <ul class="history-list">
      <template v-for="(attemptLog, index) in attemptLogs">
        <li
          @click="setSelectedAttemptLog(index)"
          class="clickable attempt-item"
          :class="{selected: isSelected(index)}"
          :key="index"
        >
          <div class="title">
            <mat-svg
              v-if="attemptLog.noattempt"
              class="item svg-item svg-noattempt"
              category="navigation"
              name="cancel"
            />
            <mat-svg
              v-else-if="attemptLog.correct"
              class="item svg-item svg-correct"
              category="action"
              name="check_circle"
            />
            <mat-svg
              v-else-if="attemptLog.error"
              class="svg-item svg-error"
              category="alert"
              name="error_outline"
            />
            <mat-svg
              v-else-if="!attemptLog.correct"
              class="item svg-item svg-wrong"
              category="navigation"
              name="cancel"
            />
            <mat-svg
              v-else-if="attemptLog.hinted"
              class="item svg-item svg-hint"
              category="action"
              name="lightbulb_outline"
            />
            <h3 class="item">
              {{ $tr('question', {questionNumber: attemptLog.questionNumber}) }}
            </h3>
          </div>
          <coach-content-label
            class="coach-content-label"
            :value="attemptLog.num_coach_contents"
            :isTopic="false"
          />
        </li>
      </template>
    </ul>
  </div>

</template>


<script>

  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';

  export default {
    name: 'attemptLogList',
    components: {
      coachContentLabel,
    },
    $trs: {
      header: 'Answer history',
      today: 'Today',
      yesterday: 'Yesterday',
      daysAgo: '{ daysElapsed } days ago',
      question: 'Question { questionNumber, number }',
    },
    props: {
      attemptLogs: {
        type: Array,
        required: true,
      },
      selectedQuestionNumber: {
        type: Number,
        required: true,
        default: 1,
      },
    },
    methods: {
      setSelectedAttemptLog(questionNumber) {
        this.$emit('select', questionNumber);
      },
      isSelected(questionNumber) {
        return Number(this.selectedQuestionNumber) === questionNumber;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .attempt-log-list
    background-color: $core-bg-light

  .title
    display: inline-block

  .coach-content-label
    display: inline-block
    vertical-align: middle
    margin-left: 8px

  .header
    margin: 0
    padding-left: 20px
    padding-top: 10px
    padding-bottom: 10px

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
    margin-right: 8px

  .svg-hint, .svg-error
    fill: $core-text-annotation

  .svg-wrong
    fill: $core-status-wrong

  .svg-correct
    fill: $core-status-correct

  .svg-noattempt
    fill: $core-text-annotation

  .attempt-item
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
