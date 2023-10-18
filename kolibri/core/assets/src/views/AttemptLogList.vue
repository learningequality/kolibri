<template>

  <div :style="{ backgroundColor: $themeTokens.surface }">
    <h3
      id="answer-history-label"
      class="header"
    >
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
    >
      <template #display>
        <AttemptLogItem
          :isSurvey="isSurvey"
          :attemptLog="attemptLogs[selectedQuestionNumber]"
          displayTag="span"
        />
      </template>
      <template #option="{ index }">
        <AttemptLogItem
          :isSurvey="isSurvey"
          :attemptLog="attemptLogs[index]"
          displayTag="span"
        />
      </template>
    </KSelect>

    <ul
      v-else
      ref="attemptList"
      class="history-list"
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
            class="attempt-item-anchor"
            :aria-selected="isSelected(index).toString()"
            :tabindex="isSelected(index) ? 0 : -1"
            @click.prevent="setSelectedAttemptLog(index)"
            @keydown.enter="setSelectedAttemptLog(index)"
            @keydown.space.prevent="setSelectedAttemptLog(index)"
          >
            <AttemptLogItem :isSurvey="isSurvey" :attemptLog="attemptLog" displayTag="p" />
          </a>
        </li>
      </template>
    </ul>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import AttemptLogItem from './AttemptLogItem';

  export default {
    name: 'AttemptLogList',
    components: {
      AttemptLogItem,
    },
    mixins: [commonCoreStrings],
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
      isSurvey: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
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
        if (
          this.$refs.attemptListOption &&
          this.$refs.attemptList &&
          this.$refs.attemptList.children
        ) {
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

  .header {
    padding-top: 10px;
    padding-bottom: 10px;
    padding-left: 16px;
    margin: 0;
  }

  .history-list {
    max-height: inherit;
    padding-right: 0;
    padding-left: 0;
    margin: 0;
    text-align: justify;
    list-style-type: none;
  }

  .history-select {
    max-width: 90%;
    padding-top: 16px;
    margin: auto;
  }

  .attempt-item {
    display: block;
    min-width: 120px;
    clear: both;
  }

  .attempt-item-anchor {
    display: block;
    padding-right: 1vw;
    padding-left: 1vw;
    cursor: pointer;
  }

</style>
