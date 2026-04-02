<template>

  <SidePanelModal @closePanel="$emit('closePanel')">
    <SidePanelLayout
      :title="objective.text"
      :subtitle="unitTitle"
      :closePanel="() => $emit('closePanel')"
      :contentContainerStyleOverrides="{ padding: 0 }"
    >
      <div
        class="summary-section"
        :style="{ backgroundColor: $themePalette.grey.v_100, color: $themeTokens.annotation }"
      >
        <div class="summary-row">
          <span class="summary-label">
            {{ completedLabel$() }}
          </span>
          <span class="summary-value summary-value-bold">
            {{ nOfMLearners$({ n: completionCount, m: totalLearners }) }}
          </span>
        </div>
        <div class="summary-row">
          <span class="summary-label">
            {{ testAveragesLabel$() }}
          </span>
          <span class="summary-value">
            <template v-if="preTestAverage !== null">
              {{
                preTestAverageLabel$({
                  correct: preTestAverage,
                  total: objective.numQuestions,
                })
              }}
            </template>
            <!-- eslint-disable-next-line vue/no-bare-strings-in-template -->
            <template v-if="preTestAverage !== null && postTestAverage !== null"> &rarr; </template>
            <template v-if="postTestAverage !== null">
              {{
                postTestAverageLabel$({
                  correct: postTestAverage,
                  total: objective.numQuestions,
                })
              }}
            </template>
          </span>
        </div>
      </div>

      <div
        v-if="strugglingCount > 0"
        class="warning-banner"
        :style="warningBannerStyle"
      >
        <KIcon
          icon="error"
          :color="$themePalette.red.v_600"
        />
        <span>{{ learnersStrugglingLabel$({ count: strugglingCount }) }}</span>
      </div>

      <div class="learner-section">
        <div class="learner-section-header">
          <h3 class="learner-section-title">
            {{ individualPerformanceLabel$() }}
          </h3>
          <p
            class="learner-section-subtitle"
            :style="{ color: $themeTokens.annotation }"
          >
            {{ sortedByScoreLabel$() }}
          </p>
        </div>
        <div class="learner-list">
          <div
            v-for="learner in sortedLearners"
            :key="learner.id"
            class="learner-row"
            :style="learnerRowStyle(learner.bucket)"
          >
            <span class="learner-name">
              <KIcon
                icon="person"
                class="learner-icon"
              />
              {{ learner.name }}
            </span>
            <span
              class="learner-score"
              :style="scoreStyle(learner.bucket)"
            >
              {{ correctOfTotalLabel$({ correct: learner.score, total: objective.numQuestions }) }}
            </span>
          </div>
        </div>
      </div>
    </SidePanelLayout>
  </SidePanelModal>

</template>


<script>

  import { computed } from 'vue';
  import SidePanelModal from 'kolibri-common/components/courses/sidePanel/SidePanelModal';
  import SidePanelLayout from 'kolibri-common/components/courses/sidePanel/SidePanelLayout';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { classifyLearnerMastery } from '../../utils/scoreBucketing';
  import { ScoreBucket, ScoreBucketTints } from '../../constants/courseConstants';

  export default {
    name: 'LearningObjectiveSidePanel',
    components: {
      SidePanelModal,
      SidePanelLayout,
    },
    setup(props) {
      const {
        nOfMLearners$,
        preTestAverageLabel$,
        postTestAverageLabel$,
        learnersStrugglingLabel$,
        correctOfTotalLabel$,
        testAveragesLabel$,
        individualPerformanceLabel$,
        sortedByScoreLabel$,
      } = coursesStrings;

      const { completedLabel$ } = coreStrings;

      const palette = themePalette();
      const tokens = themeTokens();

      const unitTitle = computed(() => {
        return props.reportData.unit_title;
      });

      // Determine which test is active (same logic as useUnitReport)
      const activeTest = computed(() => {
        const { post_test, pre_test } = props.reportData;
        if (post_test.status !== 'not_activated') {
          return post_test;
        }
        if (pre_test.status !== 'not_activated') {
          return pre_test;
        }
        return null;
      });

      const completionCount = computed(() => {
        if (!activeTest.value) {
          return 0;
        }
        return Object.keys(activeTest.value.scores).length;
      });

      const totalLearners = computed(() => props.reportData.learners.length);

      function computeAverage(testData) {
        if (!testData || testData.status === 'not_activated') {
          return null;
        }
        const takers = Object.keys(testData.scores);
        if (takers.length === 0) {
          return 0;
        }
        const loId = props.objective.id;
        const total = takers.reduce((sum, learnerId) => {
          return sum + (testData.scores[learnerId][loId] || 0);
        }, 0);
        return Math.round(total / takers.length);
      }

      const preTestAverage = computed(() => computeAverage(props.reportData.pre_test));
      const postTestAverage = computed(() => computeAverage(props.reportData.post_test));

      const sortedLearners = computed(() => {
        if (!activeTest.value) {
          return [];
        }
        const loId = props.objective.id;
        const numQuestions = props.objective.numQuestions;
        const scores = activeTest.value.scores;

        return props.reportData.learners
          .filter(learner => learner.id in scores)
          .map(learner => {
            const score = scores[learner.id][loId] || 0;
            return {
              ...learner,
              score,
              bucket: classifyLearnerMastery(score, numQuestions),
            };
          })
          .sort((a, b) => a.score - b.score);
      });

      const strugglingCount = computed(() => {
        return sortedLearners.value.filter(l => l.bucket === ScoreBucket.LOW).length;
      });

      function learnerRowStyle(bucket) {
        return {
          backgroundColor: ScoreBucketTints[bucket],
        };
      }

      function scoreStyle(bucket) {
        return {
          color: bucket === ScoreBucket.LOW ? palette.red.v_600 : tokens.text,
        };
      }

      const warningBannerStyle = computed(() => ({
        backgroundColor: ScoreBucketTints[ScoreBucket.LOW],
        color: palette.red.v_600,
      }));

      return {
        unitTitle,
        completionCount,
        totalLearners,
        preTestAverage,
        postTestAverage,
        sortedLearners,
        strugglingCount,
        learnerRowStyle,
        scoreStyle,
        warningBannerStyle,
        nOfMLearners$,
        preTestAverageLabel$,
        postTestAverageLabel$,
        learnersStrugglingLabel$,
        correctOfTotalLabel$,
        completedLabel$,
        testAveragesLabel$,
        individualPerformanceLabel$,
        sortedByScoreLabel$,
      };
    },
    props: {
      objective: {
        type: Object,
        required: true,
      },
      reportData: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style scoped>

  .summary-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 12px 24px;
  }

  .summary-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .summary-label {
    font-size: 12px;
    text-transform: uppercase;
  }

  .summary-value {
    font-size: 14px;
  }

  .summary-value-bold {
    font-weight: bold;
  }

  .warning-banner {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px 24px;
    margin-bottom: 16px;
    font-size: 14px;
  }

  .learner-section {
    padding-top: 8px;
  }

  .learner-section-header {
    padding: 8px 24px 4px;
  }

  .learner-section-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .learner-section-subtitle {
    margin: 12px 0 8px;
    font-size: 12px;
  }

  .learner-list {
    display: flex;
    flex-direction: column;
  }

  .learner-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
  }

  .learner-name {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
  }

  /* Override KIcon default top: 0.125em for proper vertical centering in flex row */
  .learner-icon {
    top: 0;
    width: 16px;
    height: 16px;
  }

  .learner-score {
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }

</style>
