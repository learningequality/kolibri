<template>

  <CoachImmersivePage
    :appBarTitle="pageTitle"
    :route="backRoute"
  >
    <h1>{{ pageTitle }}</h1>

    <div
      class="attendance-card"
      :style="{ borderColor: $themeTokens.fineLine }"
    >
      <PaginatedListContainer
        :items="sortedLearners"
        :filterPlaceholder="searchPlaceholder$()"
        :itemsPerPage="50"
        :searchFieldBlock="true"
        paginationPosition="top"
      >
        <template #default="{ items }">
          <CoreTable>
            <template #headers>
              <th class="visuallyhidden">
                {{ learnerColumnHeader$() }}
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
          <KButton
            :text="submitAttendanceAction$()"
            :primary="true"
            :disabled="submitting"
            @click="handleSubmit"
          />
        </KButtonGroup>
      </div>
    </BottomAppBar>

    <KModal
      v-if="showMarkAllModal"
      :title="markAllModalTitle$({ count: sortedLearners.length })"
      :submitText="markAllPresentAction$()"
      :cancelText="coreString('goBackAction')"
      @submit="confirmMarkAll"
      @cancel="cancelMarkAll"
    >
      <p>{{ markAllModalDescription$({ count: absentCount }) }}</p>
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
  </CoachImmersivePage>

</template>


<script>

  import { computed, ref } from 'vue';
  import { useRouter } from 'vue-router/composables';
  import { localeCompare } from 'kolibri/utils/i18n';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import store from 'kolibri/store';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import CoreTable from 'kolibri/components/CoreTable';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import PaginatedListContainer from 'kolibri-common/components/PaginatedListContainer';
  import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';
  import useCoreCoach from '../../composables/useCoreCoach';
  import { useAttendance } from '../../composables/useAttendance';
  import { PageNames } from '../../constants';
  import CoachImmersivePage from '../CoachImmersivePage';

  export default {
    name: 'AttendanceNewPage',
    components: {
      CoachImmersivePage,
      CoreTable,
      PaginatedListContainer,
      BottomAppBar,
    },
    setup() {
      const router = useRouter();
      const { classId } = useCoreCoach();
      const { formatAttendanceDateTime, createSession } = useAttendance();
      const { createSnackbar } = useSnackbar();

      const {
        pageHeading$,
        searchPlaceholder$,
        learnerColumnHeader$,
        statusColumnHeader$,
        presentLabel$,
        markAllPresentLabel$,
        markAllModalTitle$,
        markAllModalDescription$,
        submitSuccessMessage$,
        submitErrorMessage$,
        unsavedChangesTitle$,
        unsavedChangesDescription$,
        leaveAction$,
        stayAction$,
        submitAttendanceAction$,
        presentCount$,
        absentCount$,
        markAllPresentAction$,
      } = attendanceStrings;

      // Capture timestamp once on component creation
      const sessionStartDatetime = new Date();
      const { date: formattedDate, time: formattedTime } =
        formatAttendanceDateTime(sessionStartDatetime);

      const pageTitle = pageHeading$({ date: formattedDate, time: formattedTime });

      const backRoute = computed(() => ({
        name: PageNames.ATTENDANCE_HISTORY,
        params: { classId: classId.value },
      }));

      // Learner data from Vuex store
      const sortedLearners = computed(() => {
        const learners = store.getters['classSummary/learners'] || [];
        return [...learners].sort((a, b) => localeCompare(a.name, b.name));
      });

      // Attendance state
      const attendanceMap = ref({});
      const isDirty = ref(false);
      const submitting = ref(false);
      const showMarkAllModal = ref(false);
      const pendingRoute = ref(null);

      function isPresent(learnerId) {
        return !!attendanceMap.value[learnerId];
      }

      function toggleLearner(learnerId) {
        isDirty.value = true;
        attendanceMap.value = {
          ...attendanceMap.value,
          [learnerId]: !attendanceMap.value[learnerId],
        };
      }

      const presentCount = computed(
        () => Object.values(attendanceMap.value).filter(Boolean).length,
      );
      const absentCount = computed(() => sortedLearners.value.length - presentCount.value);

      // Mark all
      const allPresent = computed(
        () => sortedLearners.value.length > 0 && presentCount.value === sortedLearners.value.length,
      );

      function setAllLearners(value) {
        isDirty.value = true;
        const newMap = {};
        sortedLearners.value.forEach(l => {
          newMap[l.id] = value;
        });
        attendanceMap.value = newMap;
      }

      function handleMarkAllChange(checked) {
        if (checked) {
          showMarkAllModal.value = true;
        } else {
          setAllLearners(false);
        }
      }

      function confirmMarkAll() {
        setAllLearners(true);
        showMarkAllModal.value = false;
      }

      function cancelMarkAll() {
        showMarkAllModal.value = false;
      }

      // Submit / cancel
      async function handleSubmit() {
        submitting.value = true;
        const records = sortedLearners.value.map(learner => ({
          user: learner.id,
          present: !!attendanceMap.value[learner.id],
        }));

        try {
          await createSession({
            collection: classId.value,
            session_start_datetime: sessionStartDatetime.toISOString(),
            attendance_records: records,
          });
          isDirty.value = false;
          router.push(backRoute.value);
          createSnackbar(submitSuccessMessage$());
        } catch (_err) {
          createSnackbar(submitErrorMessage$());
        } finally {
          submitting.value = false;
        }
      }

      function handleCancel() {
        router.push(backRoute.value);
      }

      // Unsaved changes guard helpers
      function confirmLeave() {
        const route = pendingRoute.value;
        pendingRoute.value = null;
        isDirty.value = false;
        router.push(route);
      }

      function cancelLeave() {
        pendingRoute.value = null;
      }

      return {
        pageTitle,
        backRoute,
        coreString,
        sortedLearners,
        isDirty,
        submitting,
        showMarkAllModal,
        pendingRoute,
        presentCount,
        absentCount,
        allPresent,
        isPresent,
        toggleLearner,
        handleMarkAllChange,
        confirmMarkAll,
        cancelMarkAll,
        handleSubmit,
        handleCancel,
        confirmLeave,
        cancelLeave,
        searchPlaceholder$,
        learnerColumnHeader$,
        statusColumnHeader$,
        presentLabel$,
        markAllPresentLabel$,
        markAllModalTitle$,
        markAllModalDescription$,
        unsavedChangesTitle$,
        unsavedChangesDescription$,
        leaveAction$,
        stayAction$,
        submitAttendanceAction$,
        presentCount$,
        absentCount$,
        markAllPresentAction$,
      };
    },
    beforeRouteLeave(to, from, next) {
      if (this.isDirty && !this.submitting) {
        this.pendingRoute = to;
        next(false);
      } else {
        next();
      }
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
