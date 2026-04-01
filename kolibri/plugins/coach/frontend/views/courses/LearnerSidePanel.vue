<template>

  <SidePanelModal @closePanel="closePanel">
    <SidePanelLayout :closePanel="closePanel">
      <template #title>
        <div class="learner-panel-title">
          <KIcon
            icon="person"
            :color="$themeTokens.text"
            class="learner-icon"
          />
          <div>
            <h1 class="learner-name">{{ learner.name }}</h1>
            <p
              class="learner-subtitle"
              :style="{ color: $themeTokens.annotation }"
            >{{ learnerReportLabel$() }}</p>
          </div>
        </div>
      </template>

      <!-- Empty state: learner has not attempted the test -->
      <template v-if="!hasAttempted">
        <div class="empty-state">
          <div class="empty-heading-row">
            <KIcon
              icon="inProgress"
              :color="$themeTokens.primary"
              class="empty-icon"
            />
            <h3 class="empty-heading">{{ noProgressLabel$() }}</h3>
          </div>
          <p
            class="empty-description"
            :style="{ color: $themeTokens.annotation }"
          >
            {{ hasntStartedUnitsLabel$({ name: learner.name }) }}
          </p>
        </div>
      </template>

      <!-- Content: learner has scores -->
      <template v-else>

        <!-- Stats row -->
        <div
          class="stats-row"
          :style="{ borderBottomColor: $themeTokens.fineLine }"
        >
          <span
            class="stats-label"
            :style="{ color: $themeTokens.annotation }"
          >
            {{ progressLabel$() }}
          </span>
          <span
            class="stats-value"
            :style="{ color: $themeTokens.annotation }"
          >
            <strong>{{ losCompletedLabel$({ completed: loCompletedCount, total: loTotalCount }) }}</strong>
          </span>
        </div>

        <!-- Warning banner when learner is struggling with some LOs -->
        <div
          v-if="strugglingCount > 0"
          class="warning-banner"
          :style="{ backgroundColor: $themePalette.yellow.v_100 }"
        >
          <KIcon
            icon="error"
            :color="$themePalette.orange.v_600"
            class="warning-icon"
          />
          {{ strugglingWithObjectivesPrefixLabel$() }}
          <b>{{ strugglingWithObjectivesSuffixLabel$({ count: strugglingCount }) }}</b>
        </div>

        <!-- Success banner when learner is on track with all LOs -->
        <div
          v-else
          class="success-banner"
          :style="{ backgroundColor: $themePalette.green.v_100 }"
        >
          <KIcon
            icon="correct"
            :color="$themePalette.green.v_600"
            class="success-icon"
          />
          {{ onTrackWithObjectivesPrefixLabel$() }}
          <b>{{ onTrackWithObjectivesSuffixLabel$({ count: loTotalCount }) }}</b>
        </div>

        <!-- LO section -->
        <div class="lo-section">
          <div class="lo-section-heading">
            {{ individualLoPerformanceLabel$() }}
          </div>
          <div
            class="lo-section-subheading"
            :style="{ color: $themeTokens.annotation }"
          >
            {{ sortedByScoreLowestFirstLabel$() }}
          </div>

          <!-- LO table -->
          <div role="table" :aria-label="learnerReportLabel$()">
            <div role="rowgroup">
              <div role="row" class="lo-col-headers">
                <span role="columnheader" class="lo-col-header">{{ learningObjectiveLabel$() }}</span>
                <span role="columnheader" class="lo-col-header">{{ questionsCorrectLabel$() }}</span>
              </div>
            </div>
            <div role="rowgroup" class="lo-rows">
              <div
                v-for="lo in sortedLOs"
                :key="lo.id"
                role="row"
                class="lo-row"
                :style="{ backgroundColor: lo.ratio >= 0.8 ? $themePalette.green.v_100 : $themePalette.yellow.v_100 }"
              >
                <span role="cell" class="lo-cell-text">{{ lo.text }}</span>
                <span
                  role="cell"
                  class="lo-score"
                  :aria-label="xOfYCorrectLabel$({ correct: lo.correct, total: lo.numQuestions })"
                >
                  <strong class="lo-count" aria-hidden="true">{{ lo.correct }}</strong>
                  <span
                    class="lo-of-n"
                    :style="{ color: $themeTokens.annotation }"
                    aria-hidden="true"
                  >{{ ofNQuestionsLabel$({ total: lo.numQuestions }) }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </SidePanelLayout>
  </SidePanelModal>

</template>


<script>

  import { computed, toRef } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import SidePanelModal from 'kolibri-common/components/courses/sidePanel/SidePanelModal';
  import SidePanelLayout from 'kolibri-common/components/courses/sidePanel/SidePanelLayout';

  export default {
    name: 'LearnerSidePanel',
    components: {
      SidePanelModal,
      SidePanelLayout,
    },
    props: {
      prefetchedData: {
        type: Object,
        required: true,
      },
      learner: {
        type: Object,
        required: true,
      },
    },
    setup(props, { emit }) {
      const {
        learnerReportLabel$,
        noProgressLabel$,
        hasntStartedUnitsLabel$,
        strugglingWithObjectivesPrefixLabel$,
        strugglingWithObjectivesSuffixLabel$,
        onTrackWithObjectivesPrefixLabel$,
        onTrackWithObjectivesSuffixLabel$,
        xOfYCorrectLabel$,
        progressLabel$,
        losCompletedLabel$,
        individualLoPerformanceLabel$,
        sortedByScoreLowestFirstLabel$,
        learningObjectiveLabel$,
        questionsCorrectLabel$,
        ofNQuestionsLabel$,
      } = coursesStrings;

      const data = toRef(props, 'prefetchedData');

      const activeTestScores = computed(() => {
        if (!data.value?.reportData || !data.value?.activeTestType) return {};
        const testKey = data.value.activeTestType === 'post' ? 'post_test' : 'pre_test';
        return data.value.reportData[testKey]?.scores || {};
      });

      const learningObjectives = computed(() => {
        return data.value?.reportData?.learning_objectives || [];
      });

      const learnerScores = computed(() => {
        return activeTestScores.value[props.learner.id] || null;
      });

      const hasAttempted = computed(() => learnerScores.value !== null);

      const loData = computed(() => {
        return learningObjectives.value.map(lo => {
          const attempted =
            learnerScores.value !== null && learnerScores.value[lo.id] !== undefined;
          const correct = learnerScores.value ? learnerScores.value[lo.id] || 0 : 0;
          const numQuestions = lo.num_questions;
          const ratio = numQuestions > 0 ? correct / numQuestions : 0;
          return { id: lo.id, text: lo.text, correct, numQuestions, ratio, attempted };
        });
      });

      const sortedLOs = computed(() => {
        return [...loData.value].sort((a, b) => a.ratio - b.ratio);
      });

      const loCompletedCount = computed(() => loData.value.filter(lo => lo.attempted).length);
      const loTotalCount = computed(() => loData.value.length);

      const strugglingCount = computed(() => loData.value.filter(lo => lo.ratio < 0.8).length);

      function closePanel() {
        emit('close');
      }

      return {
        learnerReportLabel$,
        noProgressLabel$,
        hasntStartedUnitsLabel$,
        strugglingWithObjectivesPrefixLabel$,
        strugglingWithObjectivesSuffixLabel$,
        onTrackWithObjectivesPrefixLabel$,
        onTrackWithObjectivesSuffixLabel$,
        xOfYCorrectLabel$,
        progressLabel$,
        losCompletedLabel$,
        individualLoPerformanceLabel$,
        sortedByScoreLowestFirstLabel$,
        learningObjectiveLabel$,
        questionsCorrectLabel$,
        ofNQuestionsLabel$,
        hasAttempted,
        loCompletedCount,
        loTotalCount,
        strugglingCount,
        sortedLOs,
        closePanel,
      };
    },
  };

</script>


<style scoped>

  .learner-panel-title {
    display: flex;
    gap: 10px;
    align-items: center;
    overflow: hidden;
  }

  .learner-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
  }

  .learner-name {
    margin: 0;
    overflow: hidden;
    font-size: 20px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .learner-subtitle {
    margin: 2px 0 0;
    font-size: 13px;
  }

  .empty-state {
    padding: 2px 0;
  }

  .empty-heading-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .empty-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .empty-heading {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }

  .empty-description {
    margin: 0;
  }

  .stats-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid;
  }

  .stats-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stats-value {
    font-size: 13px;
    font-weight: 500;
  }

  .warning-banner {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 4px;
  }

  .warning-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .success-banner {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 4px;
  }

  .success-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .lo-section {
    margin-top: 16px;
  }

  .lo-section-heading {
    margin-bottom: 4px;
    font-size: 14px;
    font-weight: 700;
  }

  .lo-section-subheading {
    margin-bottom: 12px;
    font-size: 12px;
  }

  .lo-col-headers {
    display: flex;
    justify-content: space-between;
    padding: 0 8px 6px;
  }

  .lo-col-header {
    font-size: 12px;
    font-weight: 600;
  }

  .lo-rows {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .lo-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
  }

  .lo-cell-text {
    font-size: 14px;
  }

  .lo-score {
    display: flex;
    gap: 4px;
    align-items: baseline;
    white-space: nowrap;
  }

  .lo-count {
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
  }

  .lo-of-n {
    font-size: 13px;
  }

</style>
