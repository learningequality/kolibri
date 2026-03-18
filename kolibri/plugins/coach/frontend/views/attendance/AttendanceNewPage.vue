<template>

  <CoachImmersivePage
    :appBarTitle="pageTitle"
    :route="backRoute"
  >
    <div
      class="attendance-new-page"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <h1 class="page-title">{{ pageTitle }}</h1>

      <AttendanceFormTable :form="form">
        <template #action-button>
          <KButton
            :text="submitAttendanceAction$()"
            :primary="true"
            :disabled="submitting"
            @click="handleSubmit"
          />
        </template>
      </AttendanceFormTable>
    </div>
  </CoachImmersivePage>

</template>


<script>

  import { computed, ref } from 'vue';
  import { now } from 'kolibri/utils/serverClock';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';
  import useCoreCoach from '../../composables/useCoreCoach';
  import { useAttendance } from '../../composables/useAttendance';
  import useAttendanceForm from '../../composables/useAttendanceForm';
  import CoachImmersivePage from '../CoachImmersivePage';
  import AttendanceFormTable from './AttendanceFormTable';

  export default {
    name: 'AttendanceNewPage',
    components: {
      CoachImmersivePage,
      AttendanceFormTable,
    },
    setup() {
      const { classId } = useCoreCoach();
      const { formatAttendanceDateTime, createSession } = useAttendance();
      const { createSnackbar } = useSnackbar();

      const { pageHeading$, submitSuccessMessage$, submitErrorMessage$, submitAttendanceAction$ } =
        attendanceStrings;

      const isDirty = ref(false);
      const submitting = ref(false);

      // Capture timestamp once on component creation
      const sessionStartDatetime = now();
      const { date: formattedDate, time: formattedTime } =
        formatAttendanceDateTime(sessionStartDatetime);
      const pageTitle = pageHeading$({ date: formattedDate, time: formattedTime });

      const form = useAttendanceForm({
        hasChanges: computed(() => isDirty.value),
        markClean() {
          isDirty.value = false;
        },
        submitting,
        onChange() {
          isDirty.value = true;
        },
      });

      async function handleSubmit() {
        submitting.value = true;

        try {
          await createSession({
            collection: classId.value,
            session_start_datetime: sessionStartDatetime.toISOString(),
            attendance_records: form.buildRecords(),
          });
          isDirty.value = false;
          form.navigateBack();
          createSnackbar(submitSuccessMessage$());
        } catch (_err) {
          createSnackbar(submitErrorMessage$());
        } finally {
          submitting.value = false;
        }
      }

      return {
        pageTitle,
        submitting,
        handleSubmit,
        form,
        backRoute: form.backRoute,
        submitAttendanceAction$,
      };
    },
    beforeRouteLeave(to, from, next) {
      this.form.beforeRouteLeave(to, from, next);
    },
  };

</script>


<style lang="scss" scoped>

  .attendance-new-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    height: 100%;
    padding: 24px;
    margin-top: 24px;

    .page-title {
      margin: 0;
    }
  }

</style>
