<template>

  <div>
    <KCircularLoader v-if="loading" />
    <template v-else-if="activeTestStatus === 'not_activated'">
      <p class="empty-state">{{ noTestDataLabel$() }}</p>
    </template>
    <template v-else>
      <div class="lo-report-table">
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
      </div>
    </template>
  </div>

</template>


<script>

  import { computed, toRef } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import SparklineBar from '../common/SparklineBar.vue';

  export default {
    name: 'LearningObjectivesReport',
    components: {
      SparklineBar,
    },
    setup(props) {
      const { learningObjectivesLabel$, noTestDataLabel$ } = coursesStrings;

      const data = toRef(props, 'prefetchedData');

      const activeTestStatus = computed(() => data.value?.activeTestStatus || 'not_activated');
      const bucketedObjectives = computed(() => data.value?.bucketedObjectives || []);
      const loading = computed(() => !data.value);

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
      prefetchedData: {
        type: Object,
        default: null,
      },
    },
  };

</script>


<style scoped>

  .empty-state {
    padding: 16px;
  }

  .lo-link {
    padding: 12px 0 12px 16px;
  }

  .lo-sparkline {
    padding: 12px 16px 12px 0;
  }

</style>


<style>

  /* Visually hide KTable headers while keeping them accessible to screen readers */
  .lo-report-table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

</style>
