<template>

  <div>
    <KCircularLoader v-if="loading" />
    <template v-else-if="activeTestStatus === 'not_activated'">
      <p class="empty-state">{{ noTestDataLabel$() }}</p>
    </template>
    <template v-else-if="noLearnersAttempted">
      <p class="empty-state">{{ noLearnersAttemptedLabel$() }}</p>
    </template>
    <template v-else>
      <KTable
        :headers="headers"
        :rows="rows"
        :caption="learnersLabel$()"
      >
        <template #cell="{ content, colIndex, rowIndex }">
          <template v-if="rowIndex === 0">
            <span
              class="header-label"
              :style="{ color: $themeTokens.annotation }"
            >{{ content }}</span>
          </template>
          <template v-else-if="colIndex === 0">
            <KRouterLink
              :text="content"
              :to="learnerRoute(sortedLearners[rowIndex - 1])"
              icon="person"
            />
          </template>
          <template v-else-if="colIndex === 1">
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
  import { coachStrings } from '../common/commonCoachStrings';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'LearnersReport',
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
    setup(props) {
      const {
        noTestDataLabel$,
        noLearnersAttemptedLabel$,
      } = coursesStrings;
      const { groupsLabel$ } = coachStrings;
      const { learnersLabel$, learnerLabel$ } = coreStrings;

      const data = toRef(props, 'prefetchedData');

      const activeTestStatus = computed(() => data.value?.activeTestStatus || 'not_activated');
      const loading = computed(() => !data.value);

      const activeTestScores = computed(() => {
        if (!data.value?.reportData || !data.value?.activeTestType) return {};
        const testKey = data.value.activeTestType === 'post' ? 'post_test' : 'pre_test';
        return data.value.reportData[testKey]?.scores || {};
      });

      const learnersWithGroups = computed(() => {
        return data.value?.learnersWithGroups || [];
      });

      const sortedLearners = computed(() => [...learnersWithGroups.value]);

      const noLearnersAttempted = computed(() => {
        return (
          activeTestStatus.value !== 'not_activated' &&
          data.value?.activeTestType !== null &&
          Object.keys(activeTestScores.value).length === 0
        );
      });

      const headers = computed(() => [
        { label: '', dataType: 'string', columnId: 'learner' },
        { label: '', dataType: 'string', columnId: 'groups', width: '180px' },
      ]);

      const rows = computed(() => [
        [learnerLabel$(), groupsLabel$()],
        ...sortedLearners.value.map(learner => [
          learner.name,
          (learner.groups || []).join(', '),
        ]),
      ]);

      return {
        loading,
        activeTestStatus,
        noLearnersAttempted,
        headers,
        rows,
        sortedLearners,
        learnersLabel$,
        noTestDataLabel$,
        noLearnersAttemptedLabel$,
      };
    },
  };

</script>


<style scoped>

  .header-label {
    font-weight: 600;
  }

  .empty-state {
    padding: 16px;
  }

</style>
