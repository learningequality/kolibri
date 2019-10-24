<template>

  <div :style="{ backgroundColor: $themeTokens.surface }">
    <h3 class="header">
      {{ coreString('learnersLabel') }}
    </h3>

    <ul ref="learnerList" class="history-list">
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
            <mat-svg
              v-if="learner.noattempt"
              class="item svg-item"
              :style=" { fill: $themeTokens.annotation }"
              category="navigation"
              name="cancel"
            />
            <mat-svg
              v-else-if="!learner.correct"
              class="item svg-item"
              :style="{ fill: $themeTokens.incorrect }"
              category="navigation"
              name="cancel"
            />
            <mat-svg
              v-else-if="learner.hinted"
              class="item svg-item"
              :style=" { fill: $themeTokens.annotation }"
              category="action"
              name="lightbulb_outline"
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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

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
    $trs: {},
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
    width: 32px;
    height: auto;
    margin-right: 8px;
    vertical-align: middle;
  }

  .learner-item {
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
