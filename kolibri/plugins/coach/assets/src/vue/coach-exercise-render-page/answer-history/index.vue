<template>

  <div id="answer-history">
    <h3>{{ $tr('header') }}</h3>

    <ul id="history-list">
      <template v-for="(attemptLog, index) in attemptLogs">
        <li v-if="index == 0">
          <p class="item">
            {{dayElapse(attemptLog.end_timestamp)}}
          </p>
        </li>
        <li v-else-if="dayElapse(attemptLogs[index -1].end_timestamp) != dayElapse(attemptLog.end_timestamp)">
          <p class="item">
            {{dayElapse(attemptLog.end_timestamp)}}
          </p>
        </li>
        <li @click="setSelected(index)" :class="isSeleteced(index)" class="clickable">
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
              {{ $tr('question') }} {{index+1}}
            <h3>
          </div>
        </li>
      </template>
    </ul>
  </div>

</template>


<script>

  const today = new Date();
  const actions = require('../../../actions');

  module.exports = {
    $trNameSpace: 'CoachExerciseAnswerHistory',
    $trs: {
      header: 'Answer History',
      today: 'Today',
      yesterday: 'Yesterday',
      daysAgo: ' Days Ago',
      question: 'Question',
    },
    data: () => ({
      selectedIndex: 0,
    }),
    methods: {
      dayElapse(time) {
        const logDay = new Date(time);
        // one day = 24*60*60*1000 = 86400000
        const elapse = (Date.UTC(today.getYear(), today.getMonth(), today.getDate()) -
          Date.UTC(logDay.getYear(), logDay.getMonth(), logDay.getDate())) / 86400000;

        if (elapse > 1) {
          return elapse + this.$tr('daysAgo');
        }
        else if(elapse === 1) {
          return this.$tr('yesterday');
        }
        return this.$tr('today');
      },
      setSelected(index) {
        this.selectedIndex = index;
        this.setSelectedAttemptLog(this.attemptLogs[index]);
      },
      isSeleteced(index) {
        if(this.selectedIndex === index) {
          return 'selected';
        }
      },
    },
    vuex: {
      getters: {
        attemptLogs: state => state.pageState.attemptLogs,
      },
      actions: {
        setSelectedAttemptLog: actions.setSelectedAttemptLog,
      }
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  #answer-history
    background-color: $core-bg-light

  #history-list
    overflow-y: scroll
    list-style-type: none
    max-height: inherit

  .item
    display: inline-block
    height: 24px

  .svg-item
    vertical-align: middle

  .svg-hint
    fill: grey

  .svg-wrong
    fill: red

  .svg-correct
    fill: green

  ul
    padding-left: 0

  li
    clear: both
    min-width: 120px
    border-bottom: 2px solid $core-text-disabled

  .clickable
    cursor: pointer

  .selected
    background-color: $core-text-disabled

</style>
