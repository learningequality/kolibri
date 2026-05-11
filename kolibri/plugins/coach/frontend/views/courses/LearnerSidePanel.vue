<template>

  <SidePanelModal @closePanel="closePanel">
    <SidePanelLayout
      :closePanel="closePanel"
      :contentContainerStyleOverrides="{ paddingTop: '16px' }"
    >
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
            >
              {{ learnerReportLabel$() }}
            </p>
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
        <div
          class="lo-section"
          data-testid="lo-section"
        >
          <div class="lo-section-heading">
            {{ individualLoPerformanceLabel$() }}
          </div>
          <div
            class="lo-section-subheading"
            :style="{ color: $themeTokens.annotation }"
          >
            {{ sortedByScoreLowestFirstLabel$() }}
          </div>

          <table
            class="lo-table"
            :aria-label="individualLoPerformanceLabel$()"
          >
            <thead>
              <tr
                :style="{
                  borderTop: `1px solid ${$themeTokens.fineLine}`,
                  borderBottom: `1px solid ${$themeTokens.fineLine}`,
                }"
              >
                <th
                  scope="col"
                  class="lo-th"
                >
                  {{ learningObjectiveLabel$() }}
                </th>
                <th
                  scope="col"
                  class="lo-th lo-th-score"
                >
                  {{ questionsCorrectLabel$() }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="lo in sortedLOs"
                :key="lo.id"
                :style="{
                  backgroundColor:
                    lo.ratio >= MasteryThreshold.HIGH
                      ? $themePalette.green.v_100
                      : $themePalette.yellow.v_100,
                }"
              >
                <td class="lo-td">{{ lo.text }}</td>
                <td class="lo-td lo-td-score">
                  <span
                    class="lo-score"
                    :aria-label="xOfYCorrectLabel$({ correct: lo.correct, total: lo.numQuestions })"
                  >
                    <strong
                      class="lo-count"
                      aria-hidden="true"
                    >{{ lo.correct }}</strong>
                    <span
                      class="lo-of-n"
                      :style="{ color: $themeTokens.annotation }"
                      aria-hidden="true"
                    >{{ ofNQuestionsLabel$({ total: lo.numQuestions }) }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
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
  import { MasteryThreshold } from '../../constants/courseConstants';

  export default {
    name: 'LearnerSidePanel',
    components: {
      SidePanelModal,
      SidePanelLayout,
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

      const loTotalCount = computed(() => loData.value.length);

      const strugglingCount = computed(
        () => loData.value.filter(lo => lo.ratio < MasteryThreshold.HIGH).length,
      );

      function closePanel() {
        emit('close');
      }

      return {
        MasteryThreshold,
        learnerReportLabel$,
        noProgressLabel$,
        hasntStartedUnitsLabel$,
        strugglingWithObjectivesPrefixLabel$,
        strugglingWithObjectivesSuffixLabel$,
        onTrackWithObjectivesPrefixLabel$,
        onTrackWithObjectivesSuffixLabel$,
        xOfYCorrectLabel$,
        individualLoPerformanceLabel$,
        sortedByScoreLowestFirstLabel$,
        learningObjectiveLabel$,
        questionsCorrectLabel$,
        ofNQuestionsLabel$,
        hasAttempted,
        loTotalCount,
        strugglingCount,
        sortedLOs,
        closePanel,
      };
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
  };

</script>


<style scoped>

  .learner-panel-title {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    overflow: hidden;
  }

  .learner-icon {
    width: 28px;
    height: 28px;
  }

  .learner-name {
    margin: 0;
    overflow: hidden;
    font-size: 24px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .learner-subtitle {
    margin: 4px 0 0;
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
    padding-left: 28px;
    margin: 0;
    font-size: 12px;
  }

  .stats-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 8px 16px;
    margin: 16px 0;
    font-size: 14px;
  }

  .warning-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .success-banner {
    display: flex;
    flex-wrap: wrap;
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
    margin-top: 24px;
  }

  .lo-section-heading {
    margin-bottom: 4px;
    font-size: 16px;
    font-weight: 700;
  }

  .lo-section-subheading {
    margin-bottom: 16px;
    font-size: 13px;
  }

  .lo-table {
    width: 100%;
    border-collapse: collapse;
  }

  .lo-th {
    padding: 10px 8px;
    font-size: 13px;
    font-weight: 700;
    text-align: left;
  }

  .lo-th-score {
    text-align: right;
  }

  .lo-td {
    padding: 14px 8px;
    font-size: 15px;
    vertical-align: middle;
  }

  .lo-td-score {
    text-align: right;
    white-space: nowrap;
  }

  .lo-score {
    display: flex;
    gap: 4px;
    align-items: baseline;
    justify-content: flex-end;
    white-space: nowrap;
  }

  .lo-count {
    font-size: 20px;
    font-weight: 600;
  }

  .lo-of-n {
    font-size: 14px;
  }

</style>
