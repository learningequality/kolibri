<template>

  <CoachAppBarPage :appBarTitle="pageTitle">
    <KPageContainer>
      <BackLink
        :to="classHomeRoute"
        :text="coachString('classHome')"
      />
      <h1>{{ sessionTitle }}</h1>

      <CoreTable>
        <template #headers>
          <th class="visuallyhidden">
            {{ $tr('learnerNameHeader') }}
          </th>
          <th class="visuallyhidden">
            {{ $tr('attendanceStatusHeader') }}
          </th>
        </template>
        <template #tbody>
          <tbody>
            <tr
              v-for="learner in paginatedLearners"
              :key="learner.id"
              :style="rowStyle(learner.id)"
            >
              <td>
                {{ learner.name }}
              </td>
              <td class="switch-cell">
                <span
                  v-if="attendanceMap[learner.id]"
                  class="present-label"
                >
                  {{ $tr('presentLabel') }}
                </span>
                <KSwitch
                  :checked="attendanceMap[learner.id] || false"
                  :value="attendanceMap[learner.id] || false"
                  @change="toggleAttendance(learner.id, $event)"
                />
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>

      <PaginationActions
        v-if="totalPages > 1"
        v-model="currentPage"
        :itemsPerPage="learnersPerPage"
        :totalPageNumber="totalPages"
        :numFilteredItems="sortedLearners.length"
        class="pagination-nav"
      />
    </KPageContainer>

    <BottomAppBar>
      <div
        class="bottom-bar-content"
        :class="{ 'bottom-bar-content-small': windowIsSmall }"
      >
        <span class="attendance-summary">
          {{ $tr('presentCount', { count: presentCount }) }} |
          {{ $tr('absentCount', { count: absentCount }) }}
        </span>
        <div>
          <KButton
            :text="coreString('cancelAction')"
            appearance="flat-button"
            @click="handleCancel"
          />
          <KButton
            :text="$tr('markAllPresent')"
            appearance="flat-button"
            :primary="false"
            @click="showMarkAllModal = true"
          />
          <KButton
            :text="$tr('submitAttendance')"
            :primary="true"
            @click="handleSubmit"
          />
        </div>
      </div>
    </BottomAppBar>

    <KModal
      v-if="showMarkAllModal"
      :title="$tr('markAllPresentTitle')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @submit="markAllPresent"
      @cancel="showMarkAllModal = false"
    >
      <p>{{ $tr('markAllPresentConfirmation') }}</p>
    </KModal>

    <KModal
      v-if="showLeaveModal"
      :title="$tr('leavePageTitle')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @submit="confirmLeave"
      @cancel="showLeaveModal = false"
    >
      <p>{{ $tr('leavePageConfirmation') }}</p>
    </KModal>

    <KModal
      v-if="showEditConfirmModal"
      :title="$tr('editPastSessionTitle')"
      :submitText="$tr('saveChanges')"
      :cancelText="coreString('cancelAction')"
      @submit="confirmEdit"
      @cancel="showEditConfirmModal = false"
    >
      <p>{{ $tr('editPastSessionConfirmation', { date: formattedSessionDate }) }}</p>
    </KModal>
  </CoachAppBarPage>

</template>


<script>

  import { ref } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import PaginationActions from 'kolibri-common/components/PaginationActions';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CoachAppBarPage from '../CoachAppBarPage';
  import commonCoach from '../common';
  import useAttendance from '../../composables/useAttendance';
  import { PageNames } from '../../constants';

  const LEARNERS_PER_PAGE = 50;

  export default {
    name: 'MarkAttendancePage',
    components: {
      CoachAppBarPage,
      BottomAppBar,
      PaginationActions,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      const { windowIsSmall } = useKResponsiveWindow();
      const { currentSession, records, createSession, fetchRecords, submitAttendance, resetState } =
        useAttendance();

      const attendanceMap = ref({});
      const showMarkAllModal = ref(false);
      const showLeaveModal = ref(false);
      const showEditConfirmModal = ref(false);
      const hasUnsavedChanges = ref(false);
      const pendingNext = ref(null);
      const currentPage = ref(1);

      return {
        createSnackbar,
        windowIsSmall,
        currentSession,
        records,
        createSession,
        fetchRecords,
        submitAttendance,
        resetState,
        attendanceMap,
        showMarkAllModal,
        showLeaveModal,
        showEditConfirmModal,
        hasUnsavedChanges,
        pendingNext,
        currentPage,
      };
    },
    computed: {
      sortedLearners() {
        return [...this.learners].sort((a, b) => a.name.localeCompare(b.name));
      },
      learnersPerPage() {
        return LEARNERS_PER_PAGE;
      },
      totalPages() {
        return Math.ceil(this.sortedLearners.length / LEARNERS_PER_PAGE);
      },
      paginatedLearners() {
        const start = (this.currentPage - 1) * LEARNERS_PER_PAGE;
        return this.sortedLearners.slice(start, start + LEARNERS_PER_PAGE);
      },
      presentCount() {
        return Object.values(this.attendanceMap).filter(Boolean).length;
      },
      absentCount() {
        return this.sortedLearners.length - this.presentCount;
      },
      sessionTitle() {
        if (this.currentSession) {
          const date = new Date(this.currentSession.date);
          return this.$tr('sessionTitle', {
            date: this.$formatDate(date, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            sessionNumber: this.currentSession.session_number,
          });
        }
        return '';
      },
      pageTitle() {
        return this.$tr('markAttendanceTitle');
      },
      isEditingPastSession() {
        if (!this.currentSession || !this.currentSession.date) {
          return false;
        }
        const today = new Date().toISOString().split('T')[0];
        return this.currentSession.date < today;
      },
      formattedSessionDate() {
        if (!this.currentSession || !this.currentSession.date) {
          return '';
        }
        const date = new Date(this.currentSession.date);
        return this.$formatDate(date, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
      classHomeRoute() {
        return this.classRoute(PageNames.HOME_PAGE, {});
      },
    },
    beforeRouteLeave(to, from, next) {
      if (this.hasUnsavedChanges) {
        this.pendingNext = next;
        this.showLeaveModal = true;
      } else {
        next();
      }
    },
    async created() {
      const classId = this.$route.params.classId;
      const sessionId = this.$route.params.sessionId;

      if (sessionId) {
        this.currentSession = { id: sessionId };
        const recs = await this.fetchRecords(sessionId);
        recs.forEach(r => {
          this.attendanceMap[r.user] = r.present;
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        await this.createSession(classId, today);
      }
    },
    methods: {
      toggleAttendance(learnerId, value) {
        this.attendanceMap = { ...this.attendanceMap, [learnerId]: value };
        this.hasUnsavedChanges = true;
      },
      markAllPresent() {
        const map = {};
        this.sortedLearners.forEach(l => {
          map[l.id] = true;
        });
        this.attendanceMap = map;
        this.hasUnsavedChanges = true;
        this.showMarkAllModal = false;
      },
      handleSubmit() {
        if (this.isEditingPastSession) {
          this.showEditConfirmModal = true;
          return;
        }
        this.doSubmit();
      },
      async confirmEdit() {
        this.showEditConfirmModal = false;
        await this.doSubmit();
      },
      async doSubmit() {
        const recordsToSubmit = this.sortedLearners.map(l => ({
          user: l.id,
          present: this.attendanceMap[l.id] || false,
        }));
        try {
          await this.submitAttendance(this.currentSession.id, recordsToSubmit);
          this.hasUnsavedChanges = false;
          this.createSnackbar(this.$tr('attendanceSaved'));
          this.$router.push(this.classHomeRoute);
        } catch (error) {
          this.createSnackbar(this.$tr('attendanceSaveError'));
        }
      },
      handleCancel() {
        if (this.hasUnsavedChanges) {
          this.pendingNext = () => this.$router.push(this.classHomeRoute);
          this.showLeaveModal = true;
        } else {
          this.$router.push(this.classHomeRoute);
        }
      },
      confirmLeave() {
        this.showLeaveModal = false;
        this.hasUnsavedChanges = false;
        if (this.pendingNext) {
          if (typeof this.pendingNext === 'function') {
            this.pendingNext();
          }
          this.pendingNext = null;
        }
      },
      rowStyle(learnerId) {
        if (this.attendanceMap[learnerId]) {
          return {
            backgroundColor: this.$themePalette.green.v_100,
          };
        }
        return {};
      },
    },
    $trs: {
      markAttendanceTitle: {
        message: 'Mark attendance',
        context: 'Title for the mark attendance page.',
      },
      sessionTitle: {
        message: '{date} - Session {sessionNumber}',
        context: 'Title showing the date and session number for an attendance session.',
      },
      learnerNameHeader: {
        message: 'Learner name',
        context: 'Header for the learner name column in the attendance table.',
      },
      attendanceStatusHeader: {
        message: 'Attendance status',
        context: 'Header for the attendance status column in the attendance table.',
      },
      presentLabel: {
        message: 'Present',
        context: 'Label shown next to the switch when a learner is marked as present.',
      },
      presentCount: {
        message: '{count} present',
        context: 'Shows the number of learners marked as present in the bottom bar.',
      },
      absentCount: {
        message: '{count} absent',
        context: 'Shows the number of learners marked as absent in the bottom bar.',
      },
      markAllPresent: {
        message: 'Mark all present',
        context: 'Button text to mark all learners as present.',
      },
      markAllPresentTitle: {
        message: 'Mark all learners present?',
        context: 'Title of the confirmation modal when marking all learners present.',
      },
      markAllPresentConfirmation: {
        message: 'This will mark all learners as present for this session.',
        context: 'Body text of the confirmation modal when marking all learners present.',
      },
      submitAttendance: {
        message: 'Submit attendance',
        context: 'Button text to submit the attendance records.',
      },
      attendanceSaved: {
        message: 'Attendance saved',
        context: 'Snackbar message shown after attendance is successfully saved.',
      },
      attendanceSaveError: {
        message: 'There was a problem saving attendance',
        context: 'Snackbar message shown when there is an error saving attendance.',
      },
      leavePageTitle: {
        message: 'Leave this page?',
        context: 'Title of the confirmation modal when navigating away with unsaved changes.',
      },
      leavePageConfirmation: {
        message: 'You have unsaved changes. Are you sure you want to leave this page?',
        context:
          'Body text of the confirmation modal when navigating away from the attendance page with unsaved changes.',
      },
      editPastSessionTitle: {
        message: 'Edit past attendance?',
        context: 'Title of the confirmation modal when editing attendance for a past session.',
      },
      editPastSessionConfirmation: {
        message:
          'You are editing attendance for {date}. Are you sure you want to save these changes?',
        context: 'Body text of the confirmation modal when editing attendance for a past session.',
      },
      saveChanges: {
        message: 'Save changes',
        context: 'Button text to confirm saving changes to a past attendance session.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .switch-cell {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: flex-end;
  }

  .present-label {
    font-size: 14px;
    font-weight: bold;
  }

  .bottom-bar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
  }

  .bottom-bar-content-small {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    padding: 8px 0;
  }

  .attendance-summary {
    font-size: 14px;
    font-weight: bold;
  }

  .pagination-nav {
    margin-top: 8px;
    text-align: right;
  }

</style>
