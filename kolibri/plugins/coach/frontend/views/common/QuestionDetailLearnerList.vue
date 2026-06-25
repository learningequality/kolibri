<template>

  <div :style="{ backgroundColor: $themeTokens.surface }">
    <h3 class="header">
      {{ coreString('learnersLabel') }}
    </h3>

    <ul
      ref="learnerList"
      class="history-list"
      role="listbox"
      tabindex="0"
      :aria-label="coreString('learnersLabel')"
      @keydown.home.prevent="setSelectedLearner(0)"
      @keydown.end.prevent="setSelectedLearner(learners.length - 1)"
      @keydown.up.prevent="setSelectedLearner(previousLearner(selectedLearnerNumber))"
      @keydown.down.prevent="setSelectedLearner(nextLearner(selectedLearnerNumber))"
      @focus="handleListFocus"
    >
      <template v-for="(learner, index) in learners">
        <li
          :key="index"
          class="clickable learner-item"
          role="option"
          data-focus="true"
          :aria-selected="isSelected(index).toString()"
          tabindex="-1"
          :style="{
            borderBottom: `2px solid ${$themeTokens.textDisabled}`,
            backgroundColor: isSelected(index) ? $themeTokens.textDisabled : '',
          }"
          @click="setSelectedLearner(index)"
          @keydown.enter="setSelectedLearner(index)"
          @keydown.space.prevent="setSelectedLearner(index)"
        >
          <div class="title">
            <KIcon
              v-if="learner.noattempt"
              class="item svg-item"
              :style="{ fill: $themeTokens.annotation }"
              icon="notStarted"
            />
            <KIcon
              v-else-if="!learner.correct"
              class="item svg-item"
              :style="{ fill: $themeTokens.incorrect }"
              icon="incorrect"
            />
            <KIcon
              v-else-if="learner.hinted"
              class="item svg-item"
              :style="{ fill: $themeTokens.annotation }"
              icon="hint"
            />
            <h3 class="item">
              {{ learner.name }}
            </h3>
          </div>
        </li>
      </template>
    </ul>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'QuestionDetailLearnerList',
    mixins: [commonCoreStrings],
    props: {
      learners: {
        type: Array,
        required: true,
      },
      selectedLearnerNumber: {
        type: Number,
        required: true,
      },
    },
    mounted() {
      this.$nextTick(() => {
        const n = this.selectedLearnerNumber;
        this.scrollToSelectedLearner(this.$refs.learnerList.children[n], n);
      });
    },
    methods: {
      handleListFocus(event) {
        // When Shift+Tab moves focus from an li back to the ul, relatedTarget is the li.
        // In that case, don't redirect — let the user Shift+Tab out of the widget naturally.
        const fromChild =
          event.relatedTarget && this.$refs.learnerList.contains(event.relatedTarget);
        if (!fromChild) {
          this.focusLearner(this.selectedLearnerNumber);
        }
      },
      focusLearner(learnerNumber) {
        const item = this.$refs.learnerList.children[learnerNumber];
        if (item) {
          item.focus();
          this.scrollToSelectedLearner(item, learnerNumber);
        }
      },
      setSelectedLearner(learnerNumber) {
        this.focusLearner(learnerNumber);
        this.$emit('select', learnerNumber);
      },
      isSelected(learnerNumber) {
        return Number(this.selectedLearnerNumber) === learnerNumber;
      },
      previousLearner(learnerNumber) {
        return (learnerNumber - 1 + this.learners.length) % this.learners.length;
      },
      nextLearner(learnerNumber) {
        return (learnerNumber + 1) % this.learners.length;
      },
      scrollToSelectedLearner(el, learnerNumber) {
        if (el) {
          const parent = this.$el.parentElement;
          parent.scrollTop = el.offsetHeight * (learnerNumber + 1) - parent.offsetHeight / 2;
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    position: relative;
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

  h3.item {
    margin-left: 2em;
  }

  .svg-item {
    position: absolute;
    top: 50%;
    left: 0;
    width: 1.5em;
    height: auto;
    transform: translateY(-50%);
  }

  .learner-item {
    display: block;
    min-width: 120px;
    padding-left: 1em;
    clear: both;
  }

  .clickable {
    display: block;
    cursor: pointer;
  }

</style>
