<template>

  <div :style="{ backgroundColor: $themeTokens.surface }">
    <h3 class="header">
      {{ $tr('answerHistoryLabel') }}
    </h3>

    <ul ref="attemptList" class="history-list">
      <template v-for="(attemptLog, index) in attemptLogs">
        <li
          :key="index"
          class="clickable attempt-item"
          :style="{
            backgroundColor: isSelected(index) ? $themeTokens.textDisabled : '',
          }"
          @click="setSelectedAttemptLog(index)"
        >
          <div class="title">
            <mat-svg
              v-if="attemptLog.noattempt"
              class="item svg-item"
              :style=" { fill: $themeTokens.annotation }"
              category="navigation"
              name="cancel"
            />
            <mat-svg
              v-else-if="attemptLog.correct"
              class="item svg-item"
              :style="{ fill: $themeTokens.correct }"
              category="action"
              name="check_circle"
            />
            <mat-svg
              v-else-if="attemptLog.error"
              class="svg-item"
              :style=" { fill: $themeTokens.annotation }"
              category="alert"
              name="error_outline"
            />
            <mat-svg
              v-else-if="!attemptLog.correct"
              class="item svg-item"
              :style="{ fill: $themeTokens.incorrect }"
              category="navigation"
              name="cancel"
            />
            <mat-svg
              v-else-if="attemptLog.hinted"
              class="item svg-item"
              :style=" { fill: $themeTokens.annotation }"
              category="action"
              name="lightbulb_outline"
            />
            <p class="item">
              {{ coreCommon$tr('questionNumberLabel', {questionNumber: attemptLog.questionNumber}) }}
            </p>
          </div>
          <CoachContentLabel
            class="coach-content-label"
            :value="attemptLog.num_coach_contents || 0"
            :isTopic="false"
          />
        </li>
      </template>
    </ul>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';

  export default {
    name: 'AttemptLogList',
    components: {
      CoachContentLabel,
    },
    mixins: [coreStringsMixin, themeMixin],
    props: {
      attemptLogs: {
        type: Array,
        required: true,
      },
      selectedQuestionNumber: {
        type: Number,
        required: true,
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.scrollToSelectedAttemptLog(this.selectedQuestionNumber);
      });
    },
    methods: {
      setSelectedAttemptLog(questionNumber) {
        this.$emit('select', questionNumber);
        this.scrollToSelectedAttemptLog(questionNumber);
      },
      isSelected(questionNumber) {
        return Number(this.selectedQuestionNumber) === questionNumber;
      },
      scrollToSelectedAttemptLog(questionNumber) {
        const selectedElement = this.$refs.attemptList.children[questionNumber];
        if (selectedElement) {
          const parent = this.$el.parentElement;
          parent.scrollTop =
            selectedElement.offsetHeight * (questionNumber + 1) - parent.offsetHeight / 2;
        }
      },
    },
    $trs: {
      answerHistoryLabel: 'Answer history',
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    display: inline-block;
  }

  .coach-content-label {
    display: inline-block;
    margin-left: 8px;
    vertical-align: middle;
  }

  .header {
    padding-top: 10px;
    padding-bottom: 10px;
    padding-left: 20px;
    margin: 0;
  }

  .history-list {
    max-height: inherit;
    padding-left: 0;
    margin: 0;
    list-style-type: none;
  }

  .item {
    display: inline-block;
    height: 24px;
  }

  .svg-item {
    width: 24px;
    height: auto;
    margin-top: -4px;
    margin-right: 12px;
    vertical-align: middle;
  }

  .attempt-item {
    display: block;
    min-width: 120px;
    padding-left: 20px;
    clear: both;
  }

  .clickable {
    display: block;
    cursor: pointer;
  }

</style>
