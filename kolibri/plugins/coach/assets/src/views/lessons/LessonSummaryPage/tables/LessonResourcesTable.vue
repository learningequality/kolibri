<template>

  <CoreTable :emptyMessage="coachString('noResourcesInLessonLabel')">
    <template #headers>
      <th>{{ coachString('titleLabel') }}</th>
      <th>{{ coreString('progressLabel') }}</th>
      <th>{{ coachString('avgTimeSpentLabel') }}</th>
      <td v-if="editable"><!-- Actions --></td>
    </template>
    <template #tbody>
      <DragContainer
        :items="entries"
        @sort="handleResourcesOrderChange"
      >
        <transition-group
          tag="tbody"
          name="list"
        >
          <Draggable
            v-for="(tableRow, index) in entries"
            :key="tableRow.node_id"
          >
            <tr :style="{ backgroundColor: $themeTokens.surface }">
              <td>
                <div class="resource-title">
                  <DragHandle v-if="editable">
                    <!-- Mousedown.prevent is needed to avoid user selection -->
                    <DragSortWidget
                      class="sort-widget"
                      :moveUpText="moveResourceUpButtonDescription$"
                      :moveDownText="moveResourceDownButtonDescription$"
                      :isFirst="index === 0"
                      :isLast="index === entries.length - 1"
                      @moveUp="moveUpOne(index)"
                      @moveDown="moveDownOne(index)"
                      @mousedown.prevent
                    />
                  </DragHandle>
                  <KIcon
                    :icon="tableRow.kind"
                    :color="tableRow.link ? $themeTokens.link : null"
                    class="resource-icon"
                  />
                  <KRouterLink
                    v-if="tableRow.link"
                    :text="tableRow.title"
                    :to="tableRow.link"
                  />
                  <span v-else>
                    {{ tableRow.title }}
                  </span>
                </div>
              </td>
              <td>
                <StatusSummary
                  v-if="tableRow.tally"
                  :tally="tableRow.tally"
                  :verbose="true"
                />
                <KEmptyPlaceholder v-else />
              </td>
              <td>
                <TimeDuration
                  v-if="tableRow.tally"
                  :seconds="tableRow.avgTimeSpent"
                />
                <KEmptyPlaceholder v-else />
              </td>
              <td v-if="editable">
                <div class="actions">
                  <KIconButton
                    icon="clear"
                    :ariaLabel="coreString('removeAction')"
                    @click="() => handleRemoveEntry(tableRow)"
                  />
                </div>
              </td>
            </tr>
          </Draggable>
        </transition-group>
      </DragContainer>
    </template>
  </CoreTable>

</template>


<script>

  import { mapState } from 'vuex';
  import CoreTable from 'kolibri/components/CoreTable';
  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import DragContainer from 'kolibri-common/components/sortable/DragContainer';
  import DragHandle from 'kolibri-common/components/sortable/DragHandle';
  import DragSortWidget from 'kolibri-common/components/sortable/DragSortWidget';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import Draggable from 'kolibri-common/components/sortable/Draggable';
  import CSVExporter from '../../../../csv/exporter';
  import * as csvFields from '../../../../csv/fields';
  import StatusSummary from '../../../common/status/StatusSummary';
  import { coachStringsMixin } from '../../../common/commonCoachStrings';

  export default {
    name: 'LessonResourcesTable',
    components: {
      CoreTable,
      StatusSummary,
      TimeDuration,
      DragContainer,
      DragHandle,
      DragSortWidget,
      Draggable,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    setup() {
      const { moveResourceUpButtonDescription$, moveResourceDownButtonDescription$ } =
        searchAndFilterStrings;

      return {
        moveResourceUpButtonDescription$,
        moveResourceDownButtonDescription$,
      };
    },
    props: {
      title: {
        type: String,
        default: '',
      },
      entries: {
        type: Array,
        default: () => [],
      },
      editable: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapState('classSummary', { className: 'name' }),
      group() {
        return this.$route.params.groupId && this.groupMap[this.$route.params.groupId];
      },
    },
    methods: {
      handleResourcesOrderChange({ newArray }) {
        this.$emit('change', { newArray });
      },
      handleRemoveEntry(entry) {
        const newArray = this.entries.filter(({ node_id }) => node_id !== entry.node_id);
        this.handleResourcesOrderChange({ newArray });
      },
      moveUpOne(oldIndex) {
        this.swap(oldIndex, oldIndex - 1);
      },
      moveDownOne(oldIndex) {
        this.swap(oldIndex, oldIndex + 1);
      },
      swap(oldIndex, newIndex) {
        const newArray = [...this.entries];
        const oldResource = newArray[newIndex];
        newArray[newIndex] = newArray[oldIndex];
        newArray[oldIndex] = oldResource;

        this.handleResourcesOrderChange({ newArray });
      },
      /**
       * @public
       */
      exportCSV() {
        const columns = [
          ...csvFields.title(),
          ...csvFields.tally(),
          ...csvFields.timeSpent('avgTimeSpent', this.coachString('avgTimeSpentLabel')),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          lesson: this.title,
          resources: this.coreString('resourcesLabel'),
        });

        if (this.group) {
          exporter.addNames({
            group: this.group.name,
          });
        }

        exporter.export(this.entries);
      },
    },
  };

</script>


<style lang="scss" scoped>

  /deep/ .draggable-mirror {
    /* Styles to fix styles errors for having a draggable tr with fixed position */
    height: auto !important;

    td {
      width: 35%;
    }
  }

  td {
    vertical-align: middle;

    .actions {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
  }

  .resource-title {
    display: flex;
    align-items: center;

    .sort-widget {
      margin-right: 12px;
    }

    .resource-icon {
      margin-right: 8px;
    }
  }

</style>
