<template>

  <CoachImmersivePage
    :loading="pageLoading"
    :appBarTitle="pageTitle"
    :route="backRoute"
  >
    <KCircularLoader v-if="loading" />

    <template v-else>
      <div
        class="attendance-edit-page"
        :style="{ backgroundColor: $themeTokens.surface }"
      >
        <h1>{{ pageTitle }}</h1>

        <p v-if="!hasAnyLearners">
          {{ noLearnersInClassMessage$() }}
        </p>

        <AttendanceFormTable
          v-else
          :form="form"
        >
          <template
            v-if="hasCurrentLearners"
            #action-button
          >
            <KButton
              :text="coreString('saveAction')"
              :primary="true"
              :disabled="changeCount === 0 || saving"
              @click="handleSave"
            />
          </template>
        </AttendanceFormTable>
      </div>

      <KModal
        v-if="showSaveModal"
        :title="saveConfirmationTitle$({ count: changeCount })"
        :submitText="coreString('saveAction')"
        :cancelText="coreString('cancelAction')"
        @submit="confirmSave"
        @cancel="cancelSave"
      >
        <p>
          {{ presentCount$({ count: form.presentCount.value }) }}
          <span> · </span>
          <span :style="{ color: $themeTokens.error }">
            {{ absentCount$({ count: form.absentCount.value }) }}
          </span>
        </p>
      </KModal>
    </template>
  </CoachImmersivePage>

</template>


<script>

  import { computed, ref, watch } from 'vue';
  import { useRoute } from 'vue-router/composables';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import { useAttendance } from '../../composables/useAttendance';
  import useAttendanceForm from '../../composables/useAttendanceForm';
  import CoachImmersivePage from '../CoachImmersivePage';
  import AttendanceFormTable from './AttendanceFormTable';

  export default {
    name: 'AttendanceEditPage',
    components: {
      CoachImmersivePage,
      AttendanceFormTable,
    },
    setup() {
      const route = useRoute();
      const { fetchSession, fetchRecords, bulkUpdateRecords, formatAttendanceDateTime } =
        useAttendance();
      const { createSnackbar } = useSnackbar();

      const {
        editPageHeading$,
        saveConfirmationTitle$,
        updateSuccessMessage$,
        submitErrorMessage$,
        presentCount$,
        absentCount$,
        noLearnersInClassMessage$,
      } = attendanceStrings;

      const loading = ref(true);
      const pageTitle = ref('');
      const originalAttendanceMap = ref({});
      const saving = ref(false);
      const showSaveModal = ref(false);

      const attendanceId = computed(() => route.params.attendanceId);

      const form = useAttendanceForm({
        hasChanges: computed(() => changeCount.value > 0),
        markClean() {
          originalAttendanceMap.value = { ...form.attendanceMap.value };
        },
        submitting: saving,
      });

      const hasCurrentLearners = computed(() => form.sortedLearners.value.length > 0);
      const hasAnyLearners = computed(
        () =>
          form.sortedLearners.value.length > 0 || form.sortedPreviouslyEnrolled.value.length > 0,
      );

      const changedRecords = computed(() => {
        const changed = [];
        for (const learnerId of Object.keys(form.attendanceMap.value)) {
          if (!!form.attendanceMap.value[learnerId] !== !!originalAttendanceMap.value[learnerId]) {
            changed.push({
              user: learnerId,
              present: !!form.attendanceMap.value[learnerId],
            });
          }
        }
        return changed;
      });

      const changeCount = computed(() => changedRecords.value.length);

      // Save
      function handleSave() {
        showSaveModal.value = true;
      }

      async function confirmSave() {
        showSaveModal.value = false;
        saving.value = true;

        try {
          await bulkUpdateRecords(attendanceId.value, changedRecords.value);
          originalAttendanceMap.value = { ...form.attendanceMap.value };
          form.navigateBack({ snackbar: updateSuccessMessage$() });
        } catch (_err) {
          createSnackbar(submitErrorMessage$());
        } finally {
          saving.value = false;
        }
      }

      function cancelSave() {
        showSaveModal.value = false;
      }

      // Load session and records — split into current learners (editable) and
      // previously enrolled (read-only, shown at the bottom of the form).
      async function loadData(sessionId) {
        loading.value = true;
        try {
          const [session, records] = await Promise.all([
            fetchSession(sessionId),
            fetchRecords(sessionId),
          ]);
          const { date, time } = formatAttendanceDateTime(session.session_start_datetime);
          pageTitle.value = editPageHeading$({ date, time });

          const currentLearnerIds = new Set(form.sortedLearners.value.map(l => l.id));
          const currentMap = {};
          const removedRecords = [];
          records.forEach(record => {
            if (currentLearnerIds.has(record.user)) {
              currentMap[record.user] = record.present;
            } else {
              removedRecords.push(record);
            }
          });
          if (Object.keys(currentMap).length > 0) {
            form.setEnrolledLearnerIds(new Set(Object.keys(currentMap)));
          }
          form.attendanceMap.value = currentMap;
          originalAttendanceMap.value = { ...currentMap };
          form.setPreviouslyEnrolled(removedRecords);
        } catch (_err) {
          form.navigateBack({ snackbar: coreString('defaultErrorMessage') });
        } finally {
          loading.value = false;
        }
      }

      loadData(attendanceId.value);

      watch(attendanceId, newId => {
        if (newId) {
          loadData(newId);
        }
      });

      return {
        pageLoading,
        loading,
        pageTitle,
        coreString,
        saving,
        showSaveModal,
        changeCount,
        handleSave,
        confirmSave,
        cancelSave,
        form,
        backRoute: form.backRoute,
        hasCurrentLearners,
        hasAnyLearners,
        saveConfirmationTitle$,
        presentCount$,
        absentCount$,
        noLearnersInClassMessage$,
      };
    },
    beforeRouteLeave(to, from, next) {
      this.form.beforeRouteLeave(to, from, next);
    },
  };

</script>


<style lang="scss" scoped>

  .attendance-edit-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1000px;
    height: 100%;
    padding: 24px;
    margin: auto;
    margin-top: 24px;

    .page-title {
      margin: 0;
    }
  }

</style>
