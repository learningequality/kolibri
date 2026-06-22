<template>

  <div>
    <div
      class="attendance-card"
      :style="{ borderColor: $themeTokens.fineLine, backgroundColor: $themePalette.grey.v_100 }"
    >
      <PaginatedListContainer
        v-if="allItems.length > 0"
        :items="allItems"
        :filterPlaceholder="searchPlaceholder$()"
        :itemsPerPage="50"
        :searchFieldBlock="true"
        position="top"
      >
        <template #default="{ items }">
          <div
            v-if="facilityConfig && facilityConfig.enable_qr_login && sortedLearners.length > 0"
            class="scan-row"
            :style="{ borderBottom: `1px solid ${$themeTokens.fineLine}` }"
          >
            <KButton
              :text="scanToMarkPresent$()"
              :primary="true"
              @click="triggerQrFilePicker"
            />
            <input
              ref="qrFileInputRef"
              type="file"
              accept="image/*"
              capture="environment"
              class="hidden-file-input"
              @change="onQrFileSelected"
            />
          </div>
          <div
            v-if="sortedLearners.length > 0"
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
                :value="markAllSwitchValue"
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
                <template v-if="colIndex === 0">
                  <span
                    v-if="content.previouslyEnrolled"
                    :id="`learner-name-removed-${content.id}`"
                    class="previously-enrolled-name"
                    :style="{ color: $themeTokens.annotation }"
                  >
                    {{ previouslyEnrolledLabel$({ name: content.name }) }}
                  </span>
                  <span
                    v-else
                    :id="`learner-name-${content.id}`"
                  >{{ content.name }}</span>
                </template>
                <div
                  v-else
                  class="status-cell"
                >
                  <template v-if="content.previouslyEnrolled">
                    <span
                      v-if="content.present"
                      class="present-label"
                      :style="{ color: $themeTokens.annotation }"
                    >
                      {{ presentLabel$() }}
                    </span>
                    <KSwitch
                      :name="`attendance-removed-${content.id}`"
                      :value="content.present"
                      :disabled="true"
                      :ariaLabelledBy="`learner-name-removed-${content.id}`"
                    />
                  </template>
                  <template v-else>
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
                  </template>
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
      <p>{{ markAllModalDescription$({ count: currentAbsentCount }) }}</p>
      <template #actions>
        <KButtonGroup>
          <KButton
            :text="coreString('goBackAction')"
            @click="cancelMarkAll"
          />
          <KButton
            data-testid="mark-all-confirm"
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

  import { computed, ref } from 'vue';
  import { BrowserMultiFormatReader } from '@zxing/browser';
  import { darken1 } from 'kolibri-design-system/lib/styles/darkenColors';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useFacility from 'kolibri-common/composables/useFacility';
  import ClassSummaryResource from '../../apiResources/classSummary';
  import useCoreCoach from '../../composables/useCoreCoach';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import KButton from 'kolibri-design-system/lib/buttons-and-links/KButton';
  import PaginatedListContainer from 'kolibri-common/components/PaginatedListContainer';
  import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';

  export default {
    name: 'AttendanceFormTable',
    components: {
      PaginatedListContainer,
      BottomAppBar,
      KButton,
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
        previouslyEnrolledLabel$,
      } = attendanceStrings;

      const {
        scanToMarkPresent$,
        learnerMarkedPresent$,
        learnerNotInClass$,
        alreadyMarkedPresent$,
      } = qrLoginStrings;

      const { createSnackbar } = useSnackbar();
      const { facilityConfig } = useFacility();
      const { classId } = useCoreCoach();

      const {
        sortedLearners,
        sortedPreviouslyEnrolled,
        markAllPresent: markAllSwitchValue,
        presentCount: presentCountValue,
        absentCount: absentCountValue,
        currentAbsentCount: currentAbsentCountValue,
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

      const allItems = computed(() => [
        ...sortedLearners.value.map(l => ({ ...l, previouslyEnrolled: false })),
        ...sortedPreviouslyEnrolled.value.map(l => ({ ...l, previouslyEnrolled: true })),
      ]);

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

      // ---- QR scan-to-mark-present (#6) ----
      const qrFileInputRef = ref(null);

      function triggerQrFilePicker() {
        if (qrFileInputRef.value) {
          qrFileInputRef.value.click();
        }
      }

      async function onQrFileSelected(event) {
        const file = event.target.files && event.target.files[0];
        // Reset so selecting the same file twice fires change again.
        event.target.value = '';
        if (!file) return;

        // Decode the QR image to a token locally...
        let decoded;
        try {
          const url = URL.createObjectURL(file);
          try {
            const reader = new BrowserMultiFormatReader();
            const result = await reader.decodeFromImageUrl(url);
            decoded = result ? result.getText() : null;
          } finally {
            URL.revokeObjectURL(url);
          }
        } catch (_err) {
          // Image load failure or unexpected decode error — ignore silently.
          decoded = null;
        }
        if (!decoded) {
          return;
        }

        // ...then resolve the token to a learner server-side, so the full set
        // of learner login tokens is never shipped to the browser.
        let resolved;
        try {
          const response = await ClassSummaryResource.resolveQr(classId.value, decoded);
          resolved = response.data;
        } catch (_err) {
          // 404 => token does not belong to a learner in this class.
          createSnackbar(learnerNotInClass$());
          return;
        }
        const match = sortedLearners.value.find(learner => learner.id === resolved.id);
        if (!match) {
          createSnackbar(learnerNotInClass$());
          return;
        }
        if (isPresent(match.id)) {
          createSnackbar(alreadyMarkedPresent$({ name: match.name }));
          return;
        }
        toggleLearner(match.id);
        createSnackbar(learnerMarkedPresent$({ name: match.name }));
      }

      return {
        coreString,
        confirmButtonStyles,
        allItems,
        sortedLearners,
        markAllSwitchValue,
        presentCount: presentCountValue,
        absentCount: absentCountValue,
        currentAbsentCount: currentAbsentCountValue,
        showMarkAllModal,
        pendingRoute,
        isPresent,
        toggleLearner,
        handleMarkAllChange,
        confirmMarkAll,
        cancelMarkAll,
        handleCancel: () => navigateBack(),
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
        previouslyEnrolledLabel$,
        tableHeaders,
        getTableRows,
        facilityConfig,
        qrFileInputRef,
        scanToMarkPresent$,
        triggerQrFilePicker,
        onQrFileSelected,
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

  .scan-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 8px 16px;
  }

  .hidden-file-input {
    display: none;
  }

  .mark-all-label {
    font-weight: bold;
  }

  .previously-enrolled-name {
    font-size: 0.9375em;
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
