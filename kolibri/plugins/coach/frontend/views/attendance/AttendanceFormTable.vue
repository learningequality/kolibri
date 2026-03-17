<template>

  <div>
    <div
      class="attendance-card"
      :style="{ borderColor: $themeTokens.fineLine }"
    >
      <PaginatedListContainer
        :items="sortedLearners"
        :filterPlaceholder="searchPlaceholder$()"
        :itemsPerPage="50"
        :searchFieldBlock="true"
        position="top"
      >
        <template #default="{ items }">
          <CoreTable>
            <template #headers>
              <th class="visuallyhidden">
                {{ coreString('learnerLabel') }}
              </th>
              <th class="visuallyhidden">
                {{ statusColumnHeader$() }}
              </th>
            </template>
            <template #tbody>
              <tbody>
                <tr
                  class="mark-all-row"
                  :style="{
                    backgroundColor: $themeTokens.surface,
                    borderBottom: `1px solid ${$themeTokens.fineLine}`,
                  }"
                >
                  <td>
                    <span
                      id="mark-all-present-label"
                      class="mark-all-label"
                    >
                      {{ markAllPresentLabel$() }}
                    </span>
                  </td>
                  <td class="status-col">
                    <div class="status-cell">
                      <KSwitch
                        name="mark-all-present"
                        :ariaLabelledBy="'mark-all-present-label'"
                        :value="allPresent"
                        @change="handleMarkAllChange"
                      />
                    </div>
                  </td>
                </tr>
                <tr
                  v-for="learner in items"
                  :key="learner.id"
                  :style="{
                    backgroundColor: isPresent(learner.id)
                      ? $themePalette.blue.v_100
                      : $themeTokens.surface,
                    borderBottom: `1px solid ${$themeTokens.fineLine}`,
                  }"
                >
                  <td>
                    <span :id="`learner-name-${learner.id}`">{{ learner.name }}</span>
                  </td>
                  <td class="status-col">
                    <div class="status-cell">
                      <span
                        v-if="isPresent(learner.id)"
                        class="present-label"
                        :style="{ color: $themeTokens.primary }"
                      >
                        {{ presentLabel$() }}
                      </span>
                      <KSwitch
                        :name="`attendance-${learner.id}`"
                        :value="isPresent(learner.id)"
                        :ariaLabelledBy="`learner-name-${learner.id}`"
                        @change="toggleLearner(learner.id)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </template>
          </CoreTable>
        </template>
      </PaginatedListContainer>
    </div>

    <BottomAppBar>
      <div class="bottom-bar-content">
        <div>
          <span :style="{ color: $themeTokens.annotation }">{{ learnersLabel$() }}</span>
          {{ ' ' }}
          <span :style="{ color: $themeTokens.annotation }">{{
            presentCount$({ count: presentCount })
          }}</span>
          <span> · </span>
          <span :style="{ color: $themePalette.red.v_500 }">{{
            absentCount$({ count: absentCount })
          }}</span>
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
  import CoreTable from 'kolibri/components/CoreTable';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import PaginatedListContainer from 'kolibri-common/components/PaginatedListContainer';
  import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';

  export default {
    name: 'AttendanceFormTable',
    components: {
      CoreTable,
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
  }

  .mark-all-label {
    font-weight: bold;
  }

  /deep/ .status-col {
    width: 120px;
    text-align: right;
  }

  .status-cell {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
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
  }

</style>
