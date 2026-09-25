<template>

  <div>
    <p
      v-if="!hasAttempted"
      :style="{ color: $themeTokens.annotation }"
    >
      {{ noProgressLabel$() }}
    </p>

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
        <div
          :id="headingId"
          class="lo-section-heading"
        >
          {{ individualLoPerformanceLabel$() }}
        </div>
        <span
          :id="unitTitleId"
          hidden
        >{{ unitTitle }}</span>
        <div
          class="lo-section-subheading"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ sortedByScoreLowestFirstLabel$() }}
        </div>

        <table
          class="lo-table"
          :aria-labelledby="`${unitTitleId} ${headingId}`"
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
  </div>

</template>


<script>

  import { computed, toRef } from 'vue';
  import uniqueId from 'lodash/uniqueId';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { MasteryThreshold } from '../../constants/courseConstants';
  import { learnerTestScores } from '../../utils';

  export default {
    name: 'LearnerUnitReport',
    setup(props) {
      const {
        noProgressLabel$,
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

      const unitTitleId = uniqueId('learner-unit-report-title-');
      const headingId = uniqueId('learner-unit-report-heading-');

      const learningObjectives = computed(() => {
        return data.value?.reportData?.learning_objectives || [];
      });

      const learnerScores = computed(() => learnerTestScores(data.value, props.learner.id));

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

      return {
        MasteryThreshold,
        unitTitleId,
        headingId,
        noProgressLabel$,
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
      };
    },
    props: {
      prefetchedData: {
        type: Object,
        required: true,
      },
      /**
       * Names the unit's table for a11y purposes
       */
      unitTitle: {
        type: String,
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
