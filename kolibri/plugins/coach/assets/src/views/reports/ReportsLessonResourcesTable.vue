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
        @dragStart="handleDragStart"
        @sort="handleResourcesOrderChange"
      >
        <transition-group
          tag="tbody"
          name="list"
          :class="{
            'is-dragging': dragActive,
          }"
        >
          <Draggable
            v-for="(tableRow, index) in entries"
            :key="tableRow.node_id"
          >
            <tr :style="{ backgroundColor: $themeTokens.surface }">
              <td>
                <div class="resource-title">
                  <DragHandle v-if="editable">
                    <DragSortWidget
                      class="sort-widget"
                      :moveUpText="$tr('moveResourceUpButtonDescription')"
                      :moveDownText="$tr('moveResourceDownButtonDescription')"
                      :isFirst="index === 0"
                      :isLast="index === entries.length - 1"
                      @moveUp="moveUpOne(index)"
                      @moveDown="moveDownOne(index)"
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

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import StatusSummary from '../common/status/StatusSummary';
  import { coachStringsMixin } from '../common/commonCoachStrings';

  export default {
    name: 'ReportsLessonResourcesTable',
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
    props: {
      entries: {
        type: Array,
        default: () => [],
      },
      editable: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        dragActive: false,
      };
    },
    methods: {
      handleDragStart() {
        // Used to mitigate the issue of text being selected while dragging
        this.dragActive = true;
      },
      handleResourcesOrderChange({ newArray }) {
        this.$emit('sort', { newArray });
        this.dragActive = false;
      },
      handleRemoveEntry(entry) {
        this.$emit('remove', entry);
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
    },
    $trs: {
      moveResourceUpButtonDescription: {
        message: 'Move this resource one position up in this lesson',
        context: 'Refers to ordering resources.',
      },
      moveResourceDownButtonDescription: {
        message: 'Move this resource one position down in this lesson',
        context: 'Refers to ordering resources.',
      },
    },
  };

</script>


<style scoped lang="scss">

  .is-dragging {
    user-select: none;

    /deep/ .draggable-mirror {
      /* Styles to fix styles errors for having a draggable tr with fixed position */
      height: auto !important;

      td {
        width: 35%;
      }
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
