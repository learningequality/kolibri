<template>

  <div>
    <div
      class="attendance-card"
      :style="{ borderColor: $themeTokens.fineLine, backgroundColor: $themePalette.grey.v_100 }"
    >
      <PaginatedListContainer
        :items="sortedLearners"
        :filterPlaceholder="searchPlaceholder$()"
        :itemsPerPage="50"
        :searchFieldBlock="true"
        position="top"
      >
        <template #default="{ items }">
          <div
            class="mark-all-row"
            :style="{
              borderBottom: `1px solid ${$themeTokens.fineLine}`,
            }"
          >
            <span
              id="mark-all-present-label"
              class="mark-all-label"
            >
              {{ markAllPresentLabel$() }}
            </span>
            <div class="status-cell">
              <KSwitch
                name="mark-all-present"
                :ariaLabelledBy="'mark-all-present-label'"
                :value="allPresent"
                @change="handleMarkAllChange"
              />
            </div>
          </div>

          <div :style="{ backgroundColor: $themeTokens.surface }">
            <KTable
              :headers="tableHeaders"
              :rows="getTableRows(items)"
              :caption="markAttendanceAction$()"
              :stickyColumns="[]"
            >
              <template #header="{ header }">
                <span class="visuallyhidden">{{ header.label }}</span>
              </template>
              <template #cell="{ content, colIndex }">
                <span
                  v-if="colIndex === 0"
                  :id="`learner-name-${content.id}`"
                >{{ content.name }}</span>
                <div
                  v-else
                  class="status-cell"
                >
                  <span
                    v-if="isPresent(content.id)"
                    class="present-label"
                    :style="{ color: $themeTokens.primary }"
                  >
                    {{ presentLabel$() }}
                  </span>
                  <KSwitch
                    :name="`attendance-${content.id}`"
                    :value="isPresent(content.id)"
                    :ariaLabelledBy="`learner-name-${content.id}`"
                    @change="toggleLearner(content.id)"
                  />
                </div>
              </template>
            </KTable>
          </div>
        </template>
      </PaginatedListContainer>
    </div>

    <BottomAppBar>
      <div class="bottom-bar-content">
        <div :style="{ color: $themeTokens.annotation }">
          <span>{{ learnersLabel$() }}</span>
          {{ ' ' }}
          <span>{{ presentCount$({ count: presentCount }) }}</span>
          <span> · </span>
          <span>{{ absentCount$({ count: absentCount }) }}</span>
        </div>
        <KButtonGroup>
          <KButton
            :text="coreString('cancelAction')"
            appearance="flat-button"
            @click="handleCancel"
          />
          <slot name="action-button"></slot>
        </KButtonGroup>
      </div>
    </BottomAppBar>

    <KModal
      v-if="showMarkAllModal"
      :title="markAllModalTitle$({ count: sortedLearners.length })"
      @cancel="cancelMarkAll"
    >
      <p>{{ markAllModalDescription$({ count: absentCount }) }}</p>
      <template #actions>
        <KButtonGroup>
          <KButton
            :text="coreString('goBackAction')"
            @click="cancelMarkAll"
          />
          <KButton
            data-test="mark-all-confirm"
            :text="markAllPresentAction$()"
            :appearanceOverrides="confirmButtonStyles"
            @click="confirmMarkAll"
          />
        </KButtonGroup>
      </template>
    </KModal>

    <KModal
      v-if="pendingRoute"
      :title="unsavedChangesTitle$()"
      :submitText="leaveAction$()"
      :cancelText="stayAction$()"
      @submit="confirmLeave"
      @cancel="cancelLeave"
    >
      <p>{{ unsavedChangesDescription$() }}</p>
    </KModal>
  </div>

</template>


<script>

  import { darken1 } from 'kolibri-design-system/lib/styles/darkenColors';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import PaginatedListContainer from 'kolibri-common/components/PaginatedListContainer';
  import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';

  export default {
    name: 'AttendanceFormTable',
    components: {
      PaginatedListContainer,
      BottomAppBar,
    },
    setup(props) {
      const {
        searchPlaceholder$,
        statusColumnHeader$,
        presentLabel$,
        markAllPresentLabel$,
        markAllModalTitle$,
        markAllModalDescription$,
        unsavedChangesTitle$,
        unsavedChangesDescription$,
        leaveAction$,
        stayAction$,
        presentCount$,
        absentCount$,
        markAllPresentAction$,
        learnersLabel$,
        markAttendanceAction$,
      } = attendanceStrings;

      const {
        sortedLearners,
        allPresent,
        presentCount: presentCountValue,
        absentCount: absentCountValue,
        showMarkAllModal,
        pendingRoute,
        isPresent,
        toggleLearner,
        handleMarkAllChange,
        confirmMarkAll,
        cancelMarkAll,
        navigateBack,
        confirmLeave,
        cancelLeave,
      } = props.form;

      const confirmButtonStyles = {
        color: themeTokens().textInverted,
        backgroundColor: themePalette().red.v_600,
        ':hover': { backgroundColor: darken1(themePalette().red.v_600) },
      };

      const tableHeaders = [
        {
          label: coreString('learnerLabel'),
          dataType: 'string',
          columnId: 'learner',
          width: '100%',
        },
        {
          label: statusColumnHeader$(),
          dataType: 'undefined',
          columnId: 'status',
        },
      ];

      function getTableRows(items) {
        return items.map(learner => [learner, learner]);
      }

      return {
        coreString,
        confirmButtonStyles,
        sortedLearners,
        allPresent,
        presentCount: presentCountValue,
        absentCount: absentCountValue,
        showMarkAllModal,
        pendingRoute,
        isPresent,
        toggleLearner,
        handleMarkAllChange,
        confirmMarkAll,
        cancelMarkAll,
        handleCancel: navigateBack,
        confirmLeave,
        cancelLeave,
        searchPlaceholder$,
        presentLabel$,
        markAllPresentLabel$,
        markAllModalTitle$,
        markAllModalDescription$,
        unsavedChangesTitle$,
        unsavedChangesDescription$,
        leaveAction$,
        stayAction$,
        presentCount$,
        absentCount$,
        markAllPresentAction$,
        learnersLabel$,
        markAttendanceAction$,
        tableHeaders,
        getTableRows,
      };
    },
    props: {
      form: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .attendance-card {
    margin-bottom: 80px;
    border: 1px solid;
    border-radius: 4px;

    /deep/ .pagination-nav {
      padding: 8px 8px 0;
    }

    /deep/ .text-filter {
      margin-top: 0;
    }

    /deep/ td {
      padding-right: 16px;
      padding-left: 16px;
    }

    // Ensure KSwitch meets the 44x44px minimum touch target for accessibility
    /deep/ .k-switch {
      min-width: 44px;
      height: 44px;
    }
  }

  .mark-all-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
  }

  .mark-all-label {
    font-weight: bold;
  }

  .status-cell {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    white-space: nowrap;
  }

  .present-label {
    font-size: 0.875em;
    font-weight: bold;
  }

  .bottom-bar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding-bottom: 16px;
    padding-left: 24px;
    overflow: hidden;
  }

</style>
