<template>

  <div :style="{ backgroundColor: $themeTokens.surface }">
    <h3 id="answer-history-label" class="header" :style="iconStyle">
      {{ $tr('answerHistoryLabel') }}
    </h3>

    <KSelect
      v-if="isMobile"
      class="history-select"
      :value="selected"
      aria-labelledby="answer-history-label"
      :options="options"
      :disabled="$attrs.disabled"
      @change="handleDropdownChange($event.value)"
    />

    <ul
      v-else
      ref="attemptList"
      class="history-list"
      :class="isMobile ? 'mobile-list' : ''"
      role="listbox"
      @keydown.home="setSelectedAttemptLog(0)"
      @keydown.end="setSelectedAttemptLog(attemptLogs.length - 1)"
      @keydown.up.prevent="setSelectedAttemptLog(previousQuestion(selectedQuestionNumber))"
      @keydown.left.prevent="setSelectedAttemptLog(previousQuestion(selectedQuestionNumber))"
      @keydown.down.prevent="setSelectedAttemptLog(nextQuestion(selectedQuestionNumber))"
      @keydown.right.prevent="setSelectedAttemptLog(nextQuestion(selectedQuestionNumber))"
    >
      <template v-for="(attemptLog, index) in attemptLogs">
        <li
          :key="index"
          class="attempt-item"
          :style="{
            backgroundColor: isSelected(index) ? $themePalette.grey.v_100 : '',
          }"
        >
          <a
            ref="attemptListOption"
            role="option"
            :aria-selected="isSelected(index).toString()"
            :tabindex="isSelected(index) ? 0 : -1"
            :style="iconStyle"
            @click.prevent="setSelectedAttemptLog(index)"
            @keydown.enter="setSelectedAttemptLog(index)"
            @keydown.space.prevent="setSelectedAttemptLog(index)"
          >
            <KIcon
              v-if="attemptLog.noattempt"
              class="item svg-item"
              icon="notStarted"
            />
            <KIcon
              v-else-if="attemptLog.correct"
              class="item svg-item"
              :style="{ fill: $themeTokens.correct }"
              icon="correct"
            />
            <KIcon
              v-else-if="attemptLog.error"
              class="svg-item"
              :style=" { fill: $themeTokens.annotation }"
              icon="helpNeeded"
            />
            <KIcon
              v-else-if="!attemptLog.correct"
              class="item svg-item"
              :style="{ fill: $themeTokens.incorrect }"
              icon="incorrect"
            />
            <KIcon
              v-else-if="attemptLog.hinted"
              class="item svg-item"
              :style=" { fill: $themeTokens.annotation }"
              icon="hint"
            />
            <p class="item">
              {{ coreString(
                'questionNumberLabel',
                { questionNumber: attemptLog.questionNumber }
              )
              }}
            </p>
            <CoachContentLabel
              v-if="windowIsLarge"
              class="coach-content-label"
              :value="attemptLog.num_coach_contents || 0"
              :isTopic="false"
            />
          </a>
        </li>
      </template>
    </ul>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'AttemptLogList',
    components: {
      CoachContentLabel,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    props: {
      attemptLogs: {
        type: Array,
        required: true,
      },
      isMobile: {
        type: Boolean,
        required: false,
      },
      selectedQuestionNumber: {
        type: Number,
        required: true,
      },
    },
    computed: {
      iconStyle() {
        if (this.windowIsLarge) {
          return {};
        } else {
          return {
            textAlign: 'center',
            padding: 0,
          };
        }
      },
      selected() {
        return this.options.find(o => o.value === this.selectedQuestionNumber + 1) || {};
      },
      options() {
        let label = '';
        return this.attemptLogs.map(attemptLog => {
          label = this.coreString('questionNumberLabel', {
            questionNumber: attemptLog.questionNumber,
          });
          return {
            value: attemptLog.questionNumber,
            label: label,
          };
        });
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.scrollToSelectedAttemptLog(this.selectedQuestionNumber);
      });
    },
    methods: {
      handleDropdownChange(value) {
        this.$emit('select', value - 1);
      },
      setSelectedAttemptLog(questionNumber) {
        const listOption = this.$refs.attemptListOption[questionNumber];
        listOption.focus();

        this.$emit('select', questionNumber);
        this.scrollToSelectedAttemptLog(questionNumber);
      },
      isSelected(questionNumber) {
        return Number(this.selectedQuestionNumber) === questionNumber;
      },
      scrollToSelectedAttemptLog(questionNumber) {
        let selectedElement;
        if (this.$refs.attemptListOption && this.$refs.attemptList.children) {
          selectedElement = this.$refs.attemptList.children[questionNumber];
        }
        if (selectedElement) {
          const parent = this.$el.parentElement;
          parent.scrollTop =
            selectedElement.offsetHeight * (questionNumber + 1) - parent.offsetHeight / 2;
        }
      },
      previousQuestion(questionNumber) {
        return questionNumber - 1 >= 0 ? questionNumber - 1 : this.attemptLogs.length - 1;
      },
      nextQuestion(questionNumber) {
        return questionNumber + 1 < this.attemptLogs.length ? questionNumber + 1 : 0;
      },
    },
    $trs: {
      answerHistoryLabel: {
        message: 'Answer history',
        context:
          'Indicates a record of answers that a learner has responded to questions in a quiz, for example.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .coach-content-label {
    display: inline-block;
    margin-top: -4px;
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

  .history-select {
    max-width: 90%;
    padding-top: 16px;
    margin: auto;
  }

  .item {
    display: inline-block;
    height: 24px;
  }

  .svg-item {
    margin-right: 12px;
    margin-bottom: -4px;
    font-size: 24px;
  }

  .attempt-item {
    display: block;
    min-width: 120px;
    clear: both;
  }

  .attempt-item > a {
    display: block;
    padding-left: 20px;
    cursor: pointer;
  }

</style>
