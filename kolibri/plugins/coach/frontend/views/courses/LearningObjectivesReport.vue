<template>

  <div>
    <KCircularLoader v-if="loading" />
    <template v-else-if="activeTestStatus === 'not_activated'">
      <p class="empty-state">{{ noTestDataLabel$() }}</p>
    </template>
    <template v-else>
      <KTable
        :headers="headers"
        :rows="rows"
        :caption="learningObjectivesLabel$()"
      >
        <template #header>
          <!-- Headers hidden per design; caption provides accessibility -->
        </template>
        <template #cell="{ content, rowIndex, colIndex }">
          <template v-if="colIndex === 0">
            <!-- TODO: Replace :to with real route once detail route is available -->
            <KRouterLink
              class="lo-link"
              :text="content"
              :to="{}"
            />
          </template>
          <template v-else-if="colIndex === 1">
            <SparklineBar
              class="lo-sparkline"
              :lowCount="objectiveAt(rowIndex).lowCount"
              :midCount="objectiveAt(rowIndex).midCount"
              :highCount="objectiveAt(rowIndex).highCount"
            />
          </template>
        </template>
      </KTable>
    </template>
  </div>

</template>


<script>

  import { computed, onMounted, toRef, watch } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import useUnitReport from '../../composables/useUnitReport';
  import SparklineBar from '../common/SparklineBar.vue';

  export default {
    name: 'LearningObjectivesReport',
    components: {
      SparklineBar,
    },
    setup(props, { emit }) {
      const { learningObjectivesLabel$, noTestDataLabel$ } = coursesStrings;

      const { loading, fetchReport, activeTestType, activeTestStatus, bucketedObjectives } =
        useUnitReport(toRef(props, 'courseSessionId'), toRef(props, 'unitContentnodeId'));

      onMounted(() => {
        fetchReport();
      });

      // Emit report data to parent for accordion header mastery pill and title
      watch(
        [loading, bucketedObjectives],
        () => {
          if (!loading.value && bucketedObjectives.value.length) {
            emit('report-loaded', {
              activeTestType: activeTestType.value,
              activeTestStatus: activeTestStatus.value,
              bucketedObjectives: bucketedObjectives.value,
            });
          }
        },
        { immediate: true },
      );

      const headers = computed(() => [
        { label: learningObjectivesLabel$(), dataType: 'string' },
        { label: '', dataType: 'undefined', minWidth: '128px' },
      ]);

      const rows = computed(() => bucketedObjectives.value.map(obj => [obj.text, obj.id]));

      function objectiveAt(rowIndex) {
        return bucketedObjectives.value[rowIndex];
      }

      return {
        loading,
        activeTestStatus,
        headers,
        rows,
        objectiveAt,
        learningObjectivesLabel$,
        noTestDataLabel$,
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

  .empty-state {
    padding: 16px;
  }

  .lo-link {
    padding: 8px 0 8px 8px;
  }

  .lo-sparkline {
    padding-right: 8px;
  }

</style>
