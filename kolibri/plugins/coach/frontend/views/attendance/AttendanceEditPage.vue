<template>

  <CoachImmersivePage
    :appBarTitle="formattedDateTime || coachString('attendanceLabel')"
    :route="historyRoute"
  >
    <KPageContainer>
      <KCircularLoader v-if="!sessionLoaded" />
      <template v-else>
        <h1>{{ formattedDateTime }}</h1>

        <div class="attendance-table-container">
          <nav
            v-if="filteredLearners.length > 0"
            class="pagination-nav"
          >
            <span class="pagination-label">
              {{
                coachString('attendancePaginationLabel', {
                  start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  end: Math.min(currentPage * ITEMS_PER_PAGE, filteredLearners.length),
                  total: filteredLearners.length,
                })
              }}
            </span>
            <KButtonGroup>
              <KIconButton
                icon="chevronLeft"
                :ariaLabel="coachString('attendancePreviousPage')"
                :disabled="currentPage === 1"
                size="small"
                @click="currentPage = currentPage - 1"
              />
              <KIconButton
                icon="chevronRight"
                :ariaLabel="coachString('attendanceNextPage')"
                :disabled="currentPage === totalPages"
                size="small"
                @click="currentPage = currentPage + 1"
              />
            </KButtonGroup>
          </nav>

          <KTextbox
            v-model="searchQuery"
            :label="coreString('searchLabel')"
            :placeholder="coreString('searchLabel')"
            :clearable="true"
            class="search-box"
          />

          <CoreTable :emptyMessage="coreString('noResultsLabel')">
            <template #headers>
              <th class="visuallyhidden">
                {{ coachString('attendanceLearnerNameHeader') }}
              </th>
              <th class="visuallyhidden">
                {{ coachString('attendanceStatusHeader') }}
              </th>
            </template>
            <template #tbody>
              <tbody>
                <tr class="mark-all-row">
                  <td>{{ coachString('attendanceMarkAllPresent') }}</td>
                  <td class="switch-cell">
                    <KSwitch
                      :value="allPresent"
                      :ariaLabelledBy="markAllLabelId"
                      @change="handleMarkAllChange"
                    />
                    <span
                      :id="markAllLabelId"
                      class="visuallyhidden"
                    >
                      {{ coachString('attendanceMarkAllPresent') }}
                    </span>
                  </td>
                </tr>
                <tr
                  v-for="learner in paginatedLearners"
                  :key="learner.id"
                  :style="
                    attendanceMap[learner.id] ? { backgroundColor: $themePalette.blue.v_100 } : {}
                  "
                >
                  <td>{{ learner.name }}</td>
                  <td class="switch-cell">
                    <span
                      v-if="attendanceMap[learner.id]"
                      class="present-label"
                    >
                      {{ coachString('attendancePresentLabel') }}
                    </span>
                    <KSwitch
                      :value="attendanceMap[learner.id]"
                      :ariaLabelledBy="learnerLabelId(learner.id)"
                      @change="toggleLearner(learner.id)"
                    />
                    <span
                      :id="learnerLabelId(learner.id)"
                      class="visuallyhidden"
                    >
                      {{ coachString('attendanceTogglePresence', { name: learner.name }) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </template>
          </CoreTable>
        </div>
      </template>
    </KPageContainer>

    <BottomAppBar v-if="sessionLoaded">
      <span class="bottom-bar-text">
        {{ $tr('bottomBarSummary', { present: presentCount, absent: absentCount }) }}
      </span>
      <KButtonGroup>
        <KButton
          :text="coreString('cancelAction')"
          appearance="flat-button"
          :primary="false"
          :disabled="saving"
          @click="handleCancel"
        />
        <KButton
          :text="$tr('saveChanges')"
          primary
          :disabled="saving || changeCount === 0"
          @click="handleSave"
        />
      </KButtonGroup>
    </BottomAppBar>

    <KModal
      v-if="showMarkAllModal"
      :title="$tr('markAllTitle', { count: sortedLearners.length })"
      :submitText="coachString('attendanceMarkAllPresent')"
      :cancelText="$tr('goBack')"
      @submit="confirmMarkAll"
      @cancel="showMarkAllModal = false"
    >
      <p>{{ $tr('markAllOverrideMessage', { count: absentCount }) }}</p>
    </KModal>

    <KModal
      v-if="showSaveModal"
      :title="$tr('confirmChangesTitle', { datetime: formattedDateTime })"
      :submitText="$tr('confirmSubmission')"
      :cancelText="$tr('backAction')"
      @submit="confirmSave"
      @cancel="showSaveModal = false"
    >
      <p>
        {{
          $tr('confirmChangesMessage', {
            count: changeCount,
            datetime: formattedDateTime,
          })
        }}
      </p>
      <div
        class="modal-summary"
        :style="{ borderColor: $themePalette.grey.v_300 }"
      >
        <div class="modal-summary-item">
          <span class="modal-summary-label">{{ $tr('presentLabel') }}</span>
          <span>{{ $tr('learnersCount', { count: presentCount }) }}</span>
        </div>
        <div class="modal-summary-item">
          <span class="modal-summary-label">{{ $tr('absentLabel') }}</span>
          <span :style="{ color: $themeTokens.error }">
            {{ $tr('learnersCount', { count: absentCount }) }}
          </span>
        </div>
      </div>
    </KModal>

    <KModal
      v-if="showLeaveModal"
      :title="coachString('closeConfirmationTitle')"
      :submitText="coachString('attendanceContinueAction')"
      :cancelText="coreString('cancelAction')"
      @submit="confirmLeave"
      @cancel="showLeaveModal = false"
    >
      <p>{{ coachString('closeConfirmationMessage') }}</p>
    </KModal>
  </CoachImmersivePage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import CoreTable from 'kolibri/components/CoreTable';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { PageNames } from '../../constants';
  import CoachImmersivePage from '../CoachImmersivePage';
  import { coachStringsMixin } from '../common/commonCoachStrings';
  import useAttendance from '../../composables/useAttendance';

  export default {
    name: 'AttendanceEditPage',
    components: {
      CoachImmersivePage,
      BottomAppBar,
      CoreTable,
    },
    mixins: [commonCoreStrings, coachStringsMixin],
    setup() {
      const { createSnackbar } = useSnackbar();
      const { fetchSession, updateSession, currentSession, formatAttendanceDateTime } =
        useAttendance();
      return {
        createSnackbar,
        fetchSession,
        updateSession,
        currentSession,
        formatAttendanceDateTime,
      };
    },
    data() {
      return {
        sessionTimestamp: null,
        attendanceMap: {},
        originalAttendanceMap: {},
        saving: false,
        sessionLoaded: false,
        showMarkAllModal: false,
        showSaveModal: false,
        showLeaveModal: false,
        leaveToRoute: null,
        hasSubmitted: false,
        currentPage: 1,
        searchQuery: '',
        ITEMS_PER_PAGE: 50,
        markAllLabelId: 'edit-mark-all-label',
      };
    },
    computed: {
      ...mapGetters('classSummary', ['learners']),
      attendanceId() {
        return this.$route.params.attendanceId;
      },
      historyRoute() {
        return {
          name: PageNames.ATTENDANCE_HISTORY,
          params: { classId: this.$route.params.classId },
        };
      },
      formattedDateTime() {
        if (!this.sessionTimestamp) {
          return '';
        }
        return this.formatAttendanceDateTime(this.sessionTimestamp);
      },
      sortedLearners() {
        return [...this.learners].sort((a, b) => a.name.localeCompare(b.name));
      },
      filteredLearners() {
        if (!this.searchQuery) {
          return this.sortedLearners;
        }
        const query = this.searchQuery.toLowerCase();
        return this.sortedLearners.filter(l => l.name.toLowerCase().includes(query));
      },
      totalPages() {
        return Math.ceil(this.filteredLearners.length / this.ITEMS_PER_PAGE);
      },
      paginatedLearners() {
        const start = (this.currentPage - 1) * this.ITEMS_PER_PAGE;
        const end = start + this.ITEMS_PER_PAGE;
        return this.filteredLearners.slice(start, end);
      },
      allPresent() {
        if (this.sortedLearners.length === 0) {
          return false;
        }
        return this.sortedLearners.every(l => this.attendanceMap[l.id]);
      },
      presentCount() {
        return this.sortedLearners.filter(l => this.attendanceMap[l.id]).length;
      },
      absentCount() {
        return this.sortedLearners.length - this.presentCount;
      },
      changeCount() {
        return this.sortedLearners.filter(
          l => this.attendanceMap[l.id] !== this.originalAttendanceMap[l.id],
        ).length;
      },
      hasUnsavedChanges() {
        return this.changeCount > 0;
      },
    },
    beforeRouteLeave(to, from, next) {
      if (this.hasUnsavedChanges && !this.hasSubmitted) {
        this.leaveToRoute = to;
        this.showLeaveModal = true;
        next(false);
      } else {
        next();
      }
    },
    created() {
      this.loadSession();
    },
    methods: {
      learnerLabelId(learnerId) {
        return `edit-learner-label-${learnerId}`;
      },
      loadSession() {
        this.fetchSession(this.attendanceId).then(() => {
          const session = this.currentSession;
          if (session && session.attendance_records) {
            this.sessionTimestamp = new Date(
              session.date_created || session.session_start_datetime,
            );
            const map = {};
            const originalMap = {};
            session.attendance_records.forEach(r => {
              map[r.user] = r.present;
              originalMap[r.user] = r.present;
            });
            this.attendanceMap = map;
            this.originalAttendanceMap = originalMap;
            this.sessionLoaded = true;
          }
        });
      },
      toggleLearner(learnerId) {
        this.attendanceMap = {
          ...this.attendanceMap,
          [learnerId]: !this.attendanceMap[learnerId],
        };
      },
      handleMarkAllChange() {
        if (!this.allPresent) {
          this.showMarkAllModal = true;
        } else {
          const map = {};
          this.sortedLearners.forEach(l => {
            map[l.id] = false;
          });
          this.attendanceMap = map;
        }
      },
      confirmMarkAll() {
        const map = {};
        this.sortedLearners.forEach(l => {
          map[l.id] = true;
        });
        this.attendanceMap = map;
        this.showMarkAllModal = false;
      },
      handleSave() {
        this.showSaveModal = true;
      },
      confirmSave() {
        this.showSaveModal = false;
        this.saving = true;
        const records = this.sortedLearners.map(l => ({
          user: l.id,
          present: this.attendanceMap[l.id] || false,
        }));
        this.updateSession(this.attendanceId, {
          attendance_records: records,
        })
          .then(() => {
            this.hasSubmitted = true;
            this.createSnackbar(this.$tr('attendanceUpdated'));
            this.$router.push(this.historyRoute);
          })
          .catch(() => {
            this.saving = false;
            this.createSnackbar(this.$tr('attendanceSaveError'));
          });
      },
      handleCancel() {
        this.$router.push(this.historyRoute);
      },
      confirmLeave() {
        this.showLeaveModal = false;
        const route = this.leaveToRoute;
        this.leaveToRoute = null;
        this.hasSubmitted = true;
        this.$router.push(route);
      },
    },
    $trs: {
      saveChanges: {
        message: 'Save changes',
        context: 'Button label to save changes to attendance records.',
      },
      confirmChangesTitle: {
        message: 'Save changes to {datetime}?',
        context:
          'Title of the confirmation modal, where {datetime} is the formatted session date and time.',
      },
      confirmChangesMessage: {
        message:
          'You have made {count, number} {count, plural, one {change} other {changes}} to the {datetime} attendance. You can edit this attendance after submission.',
        context:
          'Confirmation message in the save modal, where {count} is the number of changes and {datetime} is the session date.',
      },
      confirmSubmission: {
        message: 'Confirm submission',
        context: 'Button label to confirm saving attendance changes.',
      },
      backAction: {
        message: 'Back',
        context: 'Button label to go back from the confirmation modal without saving.',
      },
      presentLabel: {
        message: 'Present',
        context: 'Label for the present count in the save confirmation modal.',
      },
      absentLabel: {
        message: 'Absent',
        context: 'Label for the absent count in the save confirmation modal.',
      },
      learnersCount: {
        message: '{count, number} {count, plural, one {learner} other {learners}}',
        context: 'Shows the number of learners in the save confirmation modal.',
      },
      markAllTitle: {
        message: 'Mark all {count, number} learners as present?',
        context:
          'Title of the confirmation modal when marking all learners present, where {count} is the total number of learners.',
      },
      markAllOverrideMessage: {
        message:
          'This will override {count, number} {count, plural, one {learner} other {learners}} currently marked absent.',
        context:
          'Message in the mark-all-present confirmation modal, where {count} is the number of absent learners.',
      },
      goBack: {
        message: 'Go back',
        context: 'Button label to cancel the mark-all-present action and return to the form.',
      },
      attendanceUpdated: {
        message: 'Attendance updated',
        context: 'Snackbar notification shown after attendance is successfully updated.',
      },
      attendanceSaveError: {
        message: 'There was an error saving attendance',
        context: 'Snackbar notification shown when attendance fails to save.',
      },
      bottomBarSummary: {
        message: 'Learners: {present, number} present \u00B7 {absent, number} absent',
        context:
          'Summary in the bottom bar showing the count of present and absent learners during attendance editing.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .visuallyhidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  .mark-all-row td {
    font-weight: bold;
  }

  .switch-cell {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .present-label {
    margin-right: 8px;
    font-weight: bold;
  }

  .bottom-bar-text {
    display: inline-block;
    margin-right: 8px;
    vertical-align: middle;
  }

  .pagination-nav {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 8px;
  }

  .pagination-label {
    margin-right: 8px;
  }

  .search-box {
    margin-bottom: 8px;
  }

  .modal-summary {
    display: flex;
    padding: 12px;
    margin-top: 16px;
    border: 1px solid;
    border-radius: 4px;
  }

  .modal-summary-item {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  .modal-summary-label {
    font-size: 12px;
    text-transform: uppercase;
  }

</style>
