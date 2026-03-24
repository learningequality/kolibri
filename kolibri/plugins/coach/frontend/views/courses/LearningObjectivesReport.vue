<template>

  <div>
    <KCircularLoader v-if="loading" />
    <template v-else-if="activeTestStatus === 'not_activated'">
      <!-- TODO: Replace with translated string -->
      <!-- eslint-disable-next-line vue/no-bare-strings-in-template -->
      <p class="empty-state">No test has been activated for this unit yet.</p>
    </template>
    <template v-else>
      <!-- TODO: Replace with translated string -->
      <!-- eslint-disable vue/no-bare-strings-in-template -->
      <p
        v-if="activeTestStatus === 'open'"
        class="info-note"
      >
        A test is in progress. Results shown are partial.
      </p>
      <!-- eslint-enable vue/no-bare-strings-in-template -->
      <KTable
        :headers="headers"
        :rows="rows"
        :caption="learningObjectivesLabel$()"
      >
        <template #cell="{ content, rowIndex, colIndex }">
          <template v-if="colIndex === 0">
            <!-- TODO: Replace :to with real route once detail route is available -->
            <KRouterLink
              :text="content"
              :to="{}"
            />
          </template>
          <template v-else-if="colIndex === 1">
            <SparklineBar
              :lowCount="objectiveAt(rowIndex).lowCount"
              :midCount="objectiveAt(rowIndex).midCount"
              :highCount="objectiveAt(rowIndex).highCount"
            />
          </template>
          <template v-else-if="colIndex === 2">
            <span
              class="mastery-pill"
              :style="masteryPillStyle(rowIndex)"
            >
              <KIcon
                :icon="isLowMastery(rowIndex) ? 'error' : 'correct'"
                :color="masteryIconColor(rowIndex)"
                :style="{ width: '15px', height: '15px' }"
              />
              {{ masteryLabel(rowIndex) }}
            </span>
          </template>
        </template>
      </KTable>
    </template>
  </div>

</template>


<script>

  import { computed, onMounted, toRef } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import useUnitReport from '../../composables/useUnitReport';
  import SparklineBar from '../common/SparklineBar.vue';

  export default {
    name: 'LearningObjectivesReport',
    components: {
      SparklineBar,
    },
    setup(props) {
      const { learningObjectivesLabel$, masteryLabel$, lowMasteryLabel$, strongMasteryLabel$ } =
        coursesStrings;

      const { loading, fetchReport, activeTestStatus, bucketedObjectives } = useUnitReport(
        toRef(props, 'courseSessionId'),
        toRef(props, 'unitContentnodeId'),
      );

      onMounted(() => {
        fetchReport();
      });

      const headers = computed(() => [
        { label: learningObjectivesLabel$(), dataType: 'string' },
        { label: '', dataType: 'undefined' },
        { label: masteryLabel$(), dataType: 'string' },
      ]);

      const rows = computed(() => bucketedObjectives.value.map(obj => [obj.text, obj.id, obj.id]));

      function objectiveAt(rowIndex) {
        return bucketedObjectives.value[rowIndex];
      }

      function isLowMastery(rowIndex) {
        const obj = objectiveAt(rowIndex);
        return obj.lowCount > obj.highCount;
      }

      function masteryLabel(rowIndex) {
        const obj = objectiveAt(rowIndex);
        if (obj.lowCount > obj.highCount) {
          return lowMasteryLabel$({ count: obj.lowCount });
        }
        return strongMasteryLabel$();
      }

      function masteryPillStyle(rowIndex) {
        const palette = themePalette();
        if (isLowMastery(rowIndex)) {
          return {
            backgroundColor: palette.red.v_100,
            borderColor: palette.red.v_400,
          };
        }
        return {
          backgroundColor: palette.green.v_100,
          borderColor: palette.green.v_400,
        };
      }

      function masteryIconColor(rowIndex) {
        const palette = themePalette();
        if (isLowMastery(rowIndex)) {
          return palette.red.v_600;
        }
        return palette.green.v_600;
      }

      return {
        loading,
        activeTestStatus,
        headers,
        rows,
        objectiveAt,
        isLowMastery,
        masteryLabel,
        masteryPillStyle,
        masteryIconColor,
        learningObjectivesLabel$,
      };
    },
    props: {
      courseSessionId: {
        type: String,
        required: true,
      },
      unitContentnodeId: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style scoped>

  .mastery-pill {
    display: inline-flex;
    gap: 3px;
    align-items: center;
    height: 22px;
    padding: 2px 8px 2px 3px;
    font-size: 12px;
    font-weight: 100;
    border: 1px solid;
    border-radius: 16px;
  }

  .empty-state {
    padding: 16px;
  }

  .info-note {
    padding: 8px 16px;
    font-style: italic;
  }

</style>
