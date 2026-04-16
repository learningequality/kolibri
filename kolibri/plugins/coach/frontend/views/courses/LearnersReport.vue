<template>

  <div>
    <KCircularLoader v-if="loading" />
    <template>
      <KTable
        :headers="headers"
        :rows="rows"
        :sortable="true"
        :caption="learnersLabel$()"
        class="learners-report-table"
      >
        <template #cell="{ content, colIndex, rowIndex }">
          <template v-if="colIndex === 0">
            <KRouterLink
              :text="content"
              :to="learnerRoute(sortedLearners[rowIndex])"
              icon="person"
              class="learner-link"
            />
          </template>
          <template v-else-if="colIndex === 1">
            <span
              v-if="content === 'support_needed'"
              class="risk-badge risk-badge-wide"
              :style="supportNeededStyles"
            >
              <KIcon
                icon="error"
                :color="badgeIconColor"
                class="badge-icon"
              />
              {{ supportNeededLabel$() }}
            </span>
            <span
              v-else-if="content === 'borderline'"
              class="risk-badge risk-badge-wide"
              :style="borderlineStyles"
            >
              <KIcon
                icon="error"
                :color="borderlineIconColor"
                class="badge-icon"
              />
              {{ gainingMomentumLabel$() }}
            </span>
            <span
              v-else-if="content === 'on_track'"
              class="risk-badge"
              :style="onTrackStyles"
            >
              <KIcon
                icon="correct"
                :color="badgeIconColor"
                class="badge-icon"
              />
              {{ onTrackLabel$() }}
            </span>
            <span
              v-else
              :style="{ color: $themeTokens.annotation }"
            >
              &mdash;
            </span>
          </template>
          <template v-else-if="colIndex === 2">
            <span>{{ content }}</span>
          </template>
        </template>
      </KTable>
    </template>
  </div>

</template>


<script>

  import { computed, toRef } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { MasteryThreshold } from '../../constants/courseConstants';
  import { coachStrings } from '../common/commonCoachStrings';

  export default {
    name: 'LearnersReport',
    setup(props) {
      const { supportNeededLabel$, gainingMomentumLabel$, onTrackLabel$, unitProgressLabel$ } =
        coursesStrings;
      const { groupsLabel$ } = coachStrings;
      const { learnersLabel$, learnerLabel$ } = coreStrings;

      const data = toRef(props, 'prefetchedData');

      const loading = computed(() => !data.value);

      const activeTestScores = computed(() => {
        if (!data.value?.reportData || !data.value?.activeTestType) return {};
        const testKey = data.value.activeTestType === 'post' ? 'post_test' : 'pre_test';
        return data.value.reportData[testKey]?.scores || {};
      });

      const learningObjectives = computed(() => {
        return data.value?.reportData?.learning_objectives || [];
      });

      const learnersWithGroups = computed(() => {
        return data.value?.learnersWithGroups || [];
      });

      function getLearnerRatio(learnerId) {
        const learnerScores = activeTestScores.value[learnerId];
        if (!learnerScores) return null;
        let totalCorrect = 0;
        let totalQuestions = 0;
        for (const lo of learningObjectives.value) {
          totalCorrect += learnerScores[lo.id] || 0;
          totalQuestions += lo.num_questions;
        }
        if (totalQuestions === 0) return null;
        return totalCorrect / totalQuestions;
      }

      function getRiskLevel(ratio) {
        if (ratio === null) return null;
        if (ratio <= MasteryThreshold.LOW) return 'support_needed';
        if (ratio <= MasteryThreshold.HIGH) return 'borderline';
        return 'on_track';
      }

      const sortedLearners = computed(() => {
        return [...learnersWithGroups.value]
          .map(learner => {
            const ratio = getLearnerRatio(learner.id);
            return { ...learner, ratio, riskLevel: getRiskLevel(ratio) };
          })
          .sort((a, b) => {
            // Unattempted (null ratio) sorted to the end
            if (a.ratio === null && b.ratio === null) return 0;
            if (a.ratio === null) return 1;
            if (b.ratio === null) return -1;
            // Ascending by score: most help needed (lowest score) first
            return a.ratio - b.ratio;
          });
      });

      const headers = computed(() => [
        { label: learnerLabel$(), dataType: 'string', columnId: 'learner', minWidth: '160px' },
        {
          label: unitProgressLabel$(),
          dataType: 'string',
          columnId: 'riskLevel',
          minWidth: '180px',
        },
        { label: groupsLabel$(), dataType: 'string', columnId: 'groups', minWidth: '160px' },
      ]);

      const rows = computed(() =>
        sortedLearners.value.map(learner => [
          learner.name,
          learner.riskLevel ?? '',
          (learner.groups || []).join(', '),
        ]),
      );

      const supportNeededStyles = computed(() => {
        const tokens = themeTokens();
        return {
          backgroundColor: tokens.error,
          borderColor: tokens.error,
          color: tokens.textInverted,
        };
      });

      const borderlineStyles = computed(() => {
        const tokens = themeTokens();
        return {
          backgroundColor: tokens.warning,
          borderColor: tokens.warning,
          color: tokens.text,
        };
      });

      const onTrackStyles = computed(() => {
        const tokens = themeTokens();
        return {
          backgroundColor: tokens.success,
          borderColor: tokens.success,
          color: tokens.textInverted,
        };
      });

      const badgeIconColor = computed(() => themeTokens().textInverted);
      const borderlineIconColor = computed(() => themeTokens().text);

      return {
        loading,
        headers,
        rows,
        sortedLearners,
        learnersLabel$,
        supportNeededLabel$,
        gainingMomentumLabel$,
        onTrackLabel$,
        supportNeededStyles,
        borderlineStyles,
        borderlineIconColor,
        onTrackStyles,
        badgeIconColor,
      };
    },
    props: {
      prefetchedData: {
        type: Object,
        default: null,
      },
      learnerRoute: {
        type: Function,
        required: true,
      },
    },
  };

</script>


<style scoped>

  .empty-state {
    padding: 16px;
  }

  .learners-report-table {
    font-size: 14px;
  }

  .learner-link {
    display: inline-flex;
    align-items: flex-start;
    padding: 4px 12px 5px 8px;
  }

  .risk-badge {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 5px 14px 5px 10px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    border: 1px solid;
    border-radius: 16px;
  }

  .risk-badge-wide {
    min-width: 160px;
  }

  .badge-icon {
    width: 16px;
    height: 16px;
  }

</style>
