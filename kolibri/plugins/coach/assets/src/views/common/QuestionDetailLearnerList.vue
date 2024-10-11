<template>

  <div :style="{ backgroundColor: $themeTokens.surface }">
    <h3 class="header">
      {{ coreString('learnersLabel') }}
    </h3>

    <ul
      ref="learnerList"
      class="history-list"
    >
      <template v-for="(learner, index) in learners">
        <li
          :key="index"
          class="clickable learner-item"
          :style="{
            borderBottom: `2px solid ${$themeTokens.textDisabled}`,
            backgroundColor: isSelected(index) ? $themeTokens.textDisabled : '',
          }"
          @click="setSelectedLearner(index)"
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
        this.scrollToSelectedLearner(this.selectedLearnerNumber);
      });
    },
    methods: {
      setSelectedLearner(learnerNumber) {
        this.$emit('select', learnerNumber);
        this.scrollToSelectedLearner(learnerNumber);
      },
      isSelected(learnerNumber) {
        return Number(this.selectedLearnerNumber) === learnerNumber;
      },
      scrollToSelectedLearner(learnerNumber) {
        const selectedElement = this.$refs.learnerList.children[learnerNumber];
        if (selectedElement) {
          const parent = this.$el.parentElement;
          parent.scrollTop =
            selectedElement.offsetHeight * (learnerNumber + 1) - parent.offsetHeight / 2;
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
