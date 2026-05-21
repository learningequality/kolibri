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
          <template #header="{ header }">
            {{ header.label }}
          </template>
          <template #cell="{ content, colIndex, row }">
            <template v-if="colIndex === 0">
              <KRouterLink
                class="lo-link"
                :text="content"
                :to="objectiveRoute(row[1])"
              />
            </template>
            <template v-else-if="colIndex === 1">
              <SparklineBar
                class="lo-sparkline"
                :lowCount="objectiveAt(row).lowCount"
                :midCount="objectiveAt(row).midCount"
                :highCount="objectiveAt(row).highCount"
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
      const { learningObjectivesLabel$, masteryLabel$, noTestDataLabel$ } = coursesStrings;

      const data = toRef(props, 'prefetchedData');

      const activeTestStatus = computed(() => data.value?.activeTestStatus || 'not_activated');
      const bucketedObjectives = computed(() => data.value?.bucketedObjectives || []);
      const loading = computed(() => !data.value);

      const headers = computed(() => [
        { label: learningObjectivesLabel$(), dataType: 'string', columnId: 'objective' },
        { label: masteryLabel$(), dataType: 'undefined', minWidth: '128px', columnId: 'mastery' },
      ]);

      const rows = computed(() => bucketedObjectives.value.map(obj => [obj.text, obj.id]));

      function objectiveAt(row) {
        // row is [text, id] — look up by ID to handle KTable sorting
        return bucketedObjectives.value.find(obj => obj.id === row[1]);
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
      objectiveRoute: {
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

  .lo-link {
    display: block;
    padding: 4px 12px;
    font-size: 14px;
  }

  .lo-sparkline {
    display: block;
    padding: 4px 12px;
  }

  /*
   * Visually hide KTable headers while keeping them accessible to screen readers.
   * KTable does not expose a prop to hide column headers, so this targets its
   * internal <thead> element directly. If KTable's markup changes, revisit this.
   */
  .lo-report-table /deep/ thead {
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
