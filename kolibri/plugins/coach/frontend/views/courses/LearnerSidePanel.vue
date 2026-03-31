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

        <!-- Stats rows -->
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
            <strong>{{ loCompletedCount }} {{ losCompletedOfLabel$({ total: loTotalCount }) }}</strong>
          </span>
        </div>

        <div
          class="stats-row"
          :style="{ borderBottomColor: $themeTokens.fineLine }"
        >
          <span
            class="stats-label"
            :style="{ color: $themeTokens.annotation }"
          >
            {{ testAveragesLabel$() }}
          </span>
          <span class="stats-value">
            <span v-if="preTestTotals">
              {{ preTestLabelPrefix$() }}
              <span :style="{ color: scoreColor(preTestTotals) }">{{ preTestTotals.correct }}</span>
              {{ testScoreOfTotalLabel$({ total: preTestTotals.total }) }}
            </span>
            <span
              v-if="preTestTotals && postTestTotals"
              aria-hidden="true"
            >&nbsp;&rarr;&nbsp;</span>
            <span v-if="postTestTotals">
              {{ postTestLabelPrefix$() }}
              <span :style="{ color: scoreColor(postTestTotals) }">{{ postTestTotals.correct }}</span>
              {{ testScoreOfTotalLabel$({ total: postTestTotals.total }) }}
            </span>
            <span v-if="!preTestTotals && !postTestTotals">&mdash;</span>
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
          <b>{{ strugglingCount }} {{ strugglingWithObjectivesSuffixLabel$({ count: strugglingCount }) }}</b>
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

          <!-- Column headers -->
          <div
            class="lo-col-headers"
            :style="{ color: $themeTokens.annotation, borderBottomColor: $themeTokens.fineLine }"
          >
            <span>{{ learningObjectiveLabel$() }}</span>
            <span>{{ questionsCorrectLabel$() }}</span>
          </div>

          <!-- LO rows sorted by score ascending -->
          <div
            v-for="lo in sortedLOs"
            :key="lo.id"
            class="lo-row"
            :style="{ borderBottomColor: $themeTokens.fineLine, backgroundColor: lo.ratio > 0.8 ? $themePalette.green.v_100 : $themePalette.yellow.v_100 }"
          >
            <span class="lo-text">{{ lo.text }}</span>
            <span
              class="lo-score"
              :aria-label="xOfYCorrectLabel$({ correct: lo.correct, total: lo.numQuestions })"
            >
              <strong
                class="lo-count"
                aria-hidden="true"
              >{{ lo.correct }}</strong>
              <span aria-hidden="true"> {{ ofNQuestionsLabel$({ total: lo.numQuestions }) }}</span>
            </span>
          </div>
        </div>
      </template>
    </SidePanelLayout>
  </SidePanelModal>

</template>


<script>

  import { computed, toRef } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
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
        xOfYCorrectLabel$,
        progressLabel$,
        testAveragesLabel$,
        losCompletedOfLabel$,
        preTestLabelPrefix$,
        postTestLabelPrefix$,
        testScoreOfTotalLabel$,
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

      // An LO is "struggling" when the learner attempted it but scored in the non-high band (ratio <= 0.8)
      const strugglingCount = computed(() => loData.value.filter(lo => lo.attempted && lo.ratio <= 0.8).length);

      function getTestTotals(testKey) {
        const scores = data.value?.reportData?.[testKey]?.scores?.[props.learner.id];
        if (!scores || Object.keys(scores).length === 0) return null;
        const los = learningObjectives.value;
        const correct = los.reduce((sum, lo) => sum + (scores[lo.id] || 0), 0);
        const total = los.reduce((sum, lo) => sum + lo.num_questions, 0);
        return { correct, total };
      }

      const preTestTotals = computed(() => getTestTotals('pre_test'));
      const postTestTotals = computed(() => getTestTotals('post_test'));

      function scoreColor({ correct, total }) {
        const tokens = themeTokens();
        const ratio = total > 0 ? correct / total : 0;
        if (ratio > 0.6) return tokens.success;
        if (ratio > 0.45) return themePalette().orange.v_600;
        return tokens.error;
      }

      function closePanel() {
        emit('close');
      }

      return {
        learnerReportLabel$,
        noProgressLabel$,
        hasntStartedUnitsLabel$,
        strugglingWithObjectivesPrefixLabel$,
        strugglingWithObjectivesSuffixLabel$,
        xOfYCorrectLabel$,
        progressLabel$,
        testAveragesLabel$,
        losCompletedOfLabel$,
        preTestLabelPrefix$,
        postTestLabelPrefix$,
        testScoreOfTotalLabel$,
        individualLoPerformanceLabel$,
        sortedByScoreLowestFirstLabel$,
        learningObjectiveLabel$,
        questionsCorrectLabel$,
        ofNQuestionsLabel$,
        hasAttempted,
        loCompletedCount,
        loTotalCount,
        preTestTotals,
        postTestTotals,
        strugglingCount,
        sortedLOs,
        scoreColor,
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
    padding: 6px 12px;
    font-size: 12px;
    border-bottom: 1px solid;
  }

  .lo-row {
    display: flex;
    gap: 0;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid;
  }

  .lo-text {
    flex-grow: 1;
    font-size: 14px;
  }

  .lo-score {
    flex-shrink: 0;
    font-size: 13px;
    white-space: nowrap;
  }

  .lo-count {
    font-size: 16px;
  }

</style>
