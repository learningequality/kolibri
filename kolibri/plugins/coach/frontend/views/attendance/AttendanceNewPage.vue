<template>

  <CoachImmersivePage
    :appBarTitle="$tr('markAttendanceHeader', { datetime: formattedDateTime })"
    :route="historyRoute"
  >
    <KPageContainer>
      <h1>{{ $tr('markAttendanceHeader', { datetime: formattedDateTime }) }}</h1>

      <p v-if="sortedLearners.length === 0">
        {{ $tr('noLearners') }}
      </p>
      <div
        v-else
        class="attendance-table-container"
      >
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

        <CoreTable>
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
    </KPageContainer>

    <BottomAppBar>
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
          :text="$tr('submitAttendance')"
          primary
          :disabled="saving"
          @click="handleSubmit"
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

  import { mapState, mapGetters } from 'vuex';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import CoreTable from 'kolibri/components/CoreTable';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { PageNames } from '../../constants';
  import CoachImmersivePage from '../CoachImmersivePage';
  import { coachStringsMixin } from '../common/commonCoachStrings';
  import useAttendance from '../../composables/useAttendance';

  export default {
    name: 'AttendanceNewPage',
    components: {
      CoachImmersivePage,
      BottomAppBar,
      CoreTable,
    },
    mixins: [commonCoreStrings, coachStringsMixin],
    setup() {
      const { createSnackbar } = useSnackbar();
      const { createSession, formatAttendanceDateTime } = useAttendance();
      return {
        createSnackbar,
        createSession,
        formatAttendanceDateTime,
      };
    },
    data() {
      return {
        sessionTimestamp: null,
        attendanceMap: {},
        saving: false,
        showMarkAllModal: false,
        showLeaveModal: false,
        leaveToRoute: null,
        hasSubmitted: false,
        currentPage: 1,
        searchQuery: '',
        ITEMS_PER_PAGE: 50,
        markAllLabelId: 'mark-all-label',
      };
    },
    computed: {
      ...mapState('classSummary', {
        classId: 'id',
      }),
      ...mapGetters('classSummary', ['learners']),
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
      hasUnsavedChanges() {
        return this.sortedLearners.some(l => this.attendanceMap[l.id]);
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
      this.sessionTimestamp = new Date();
      this.initAttendanceMap();
    },
    methods: {
      learnerLabelId(learnerId) {
        return `learner-label-${learnerId}`;
      },
      initAttendanceMap() {
        const map = {};
        this.learners.forEach(learner => {
          map[learner.id] = false;
        });
        this.attendanceMap = map;
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
      handleSubmit() {
        this.saving = true;
        const records = this.sortedLearners.map(l => ({
          user: l.id,
          present: this.attendanceMap[l.id] || false,
        }));
        this.createSession({
          collection: this.classId,
          session_start_datetime: this.sessionTimestamp.toISOString(),
          attendance_records: records,
        })
          .then(() => {
            this.hasSubmitted = true;
            this.createSnackbar(this.$tr('attendanceSaved'));
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
      markAttendanceHeader: {
        message: 'Mark attendance: {datetime}',
        context:
          'Header shown on the attendance taking page, where {datetime} is the formatted date and time.',
      },
      submitAttendance: {
        message: 'Submit attendance',
        context: 'Button label to save and submit the attendance records.',
      },
      noLearners: {
        message: 'No learners in this class',
        context: 'Message displayed when there are no learners enrolled in the class.',
      },
      attendanceSaved: {
        message: 'Attendance saved',
        context: 'Snackbar notification shown after attendance is successfully saved.',
      },
      attendanceSaveError: {
        message: 'There was an error saving attendance',
        context: 'Snackbar notification shown when attendance fails to save.',
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
      bottomBarSummary: {
        message: 'Learners: {present, number} present \u00B7 {absent, number} absent',
        context:
          'Summary in the bottom bar showing the count of present and absent learners during attendance taking.',
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

</style>
