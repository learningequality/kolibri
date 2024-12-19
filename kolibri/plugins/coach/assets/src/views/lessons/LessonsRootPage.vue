<template>

  <CoachAppBarPage showSubNav>
    <KPageContainer>
      <CoachHeader :title="coreString('lessonsLabel')">
        <template #actions>
          <div class="lesson-button">
            <KRouterLink
              primary
              appearance="raised-button"
              :text="coachString('newLessonAction')"
              :to="newLessonRoute"
            />
          </div>
        </template>
      </CoachHeader>
      <div>
        <p
          v-if="calcTotalSizeOfVisibleLessons !== null"
          class="total-size"
        >
          {{ coachString('totalLessonsSize', { size: calcTotalSizeOfVisibleLessons }) }}
        </p>
        <ReportsControls @export="exportCSV">
          <div :style="windowIsSmall ? { display: 'grid' } : {}">
            <KSelect
              v-model="filterSelection"
              class="select"
              :label="coachString('filterLessonStatus')"
              :options="filterOptions"
              :inline="true"
            />
            <KSelect
              v-model="filterRecipents"
              :value="{ label: coreString('allLabel'), value: coreString('allLabel') }"
              class="select"
              :label="coachString('recipientsLabel')"
              :options="recipientOptions"
              :inline="true"
            />
          </div>
        </ReportsControls>

        <CoreTable
          :dataLoading="lessonsAreLoading"
          :emptyMessage="$tr('noLessons')"
        >
          <template #headers>
            <th>{{ coachString('titleLabel') }}</th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ $tr('size') }}</th>
            <th>{{ coachString('recipientsLabel') }}</th>
            <th>{{ coachString('lessonVisibleLabel') }}</th>
          </template>
          <template #tbody>
            <transition-group
              tag="tbody"
              name="list"
            >
              <tr
                v-for="lesson in sortedLessons"
                v-show="showLesson(lesson)"
                :key="lesson.id"
              >
                <td>
                  <KRouterLink
                    :to="lessonSummaryLink({ lessonId: lesson.id })"
                    :text="lesson.title"
                    icon="lesson"
                  />
                </td>
                <td>
                  <StatusSummary
                    :tally="lesson.tally"
                    :verbose="true"
                  />
                </td>
                <td>
                  {{
                    coachString('resourcesAndSize', {
                      value: lesson.resources.length,
                      size: bytesForHumans(lesson.size),
                    })
                  }}
                </td>
                <td>
                  <Recipients
                    :groupNames="getRecipientNamesForLesson(lesson)"
                    :hasAssignments="lesson.assignments.length > 0 || lesson.learner_ids.length > 0"
                  />
                </td>
                <td>
                  <div :style="{ height: '28px' }">
                    <KTransition kind="component-fade-out-in">
                      <KCircularLoader
                        v-if="show(lesson.id, isUpdatingVisibility(lesson.id), 2000)"
                        :key="`loader-${lesson.id}`"
                        disableDefaultTransition
                        :style="{ display: 'inline-block', marginLeft: '6px' }"
                        :size="26"
                      />
                      <KSwitch
                        v-else
                        :key="`switch-${lesson.id}`"
                        name="toggle-lesson-visibility"
                        label=""
                        :checked="lesson.active"
                        :value="lesson.active"
                        @change="toggleModal(lesson)"
                      />
                    </KTransition>
                  </div>
                </td>
              </tr>
            </transition-group>
          </template>
        </CoreTable>

        <p v-if="showNoResultsLabel">
          {{ coreString('noResultsLabel') }}
        </p>

        <KModal
          v-if="showLessonIsVisibleModal && !userHasDismissedModal"
          :title="coachString('makeLessonVisibleTitle')"
          :submitText="coreString('continueAction')"
          :cancelText="coreString('cancelAction')"
          @submit="handleToggleVisibility(activeLesson)"
          @cancel="showLessonIsVisibleModal = false"
        >
          <p>{{ coachString('makeLessonVisibleText') }}</p>
          <p>{{ $tr('fileSizeToDownload', { size: bytesForHumans(activeLesson.size) }) }}</p>
          <KCheckbox
            :checked="dontShowAgainChecked"
            :label="$tr('dontShowAgain')"
            @change="dontShowAgainChecked = $event"
          />
        </KModal>

        <KModal
          v-if="showLessonIsNotVisibleModal && !userHasDismissedModal"
          :title="coachString('makeLessonNotVisibleTitle')"
          :submitText="coreString('continueAction')"
          :cancelText="coreString('cancelAction')"
          @submit="handleToggleVisibility(activeLesson)"
          @cancel="showLessonIsNotVisibleModal = false"
        >
          <p>{{ coachString('makeLessonNotVisibleText') }}</p>
          <p>{{ $tr('fileSizeToRemove', { size: bytesForHumans(activeLesson.size) }) }}</p>
          <KCheckbox
            :checked="dontShowAgainChecked"
            :label="$tr('dontShowAgain')"
            @change="dontShowAgainChecked = $event"
          />
        </KModal>

        <KModal
          v-if="showModal"
          :title="coachString('createLessonAction')"
          :submitText="coreString('continueAction')"
          :cancelText="coreString('cancelAction')"
          :submitDisabled="detailsModalIsDisabled"
          :cancelDisabled="detailsModalIsDisabled"
          @cancel="showModal = false"
          @submit="$refs.detailsModal.submitData()"
        >
          <AssignmentDetailsModal
            ref="detailsModal"
            assignmentType="lesson"
            :assignment="{ assignments: [classId] }"
            :classId="classId"
            :groups="learnerGroups"
            :disabled="detailsModalIsDisabled"
            @submit="handleDetailsModalContinue"
            @cancel="showModal = false"
          />
        </KModal>
      </div>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import Vue, { set } from 'vue';
  import { mapState, mapActions } from 'vuex';
  import LessonResource from 'kolibri-common/apiResources/LessonResource';
  import countBy from 'lodash/countBy';
  import { LESSON_VISIBILITY_MODAL_DISMISSED, ERROR_CONSTANTS } from 'kolibri/constants';
  import Lockr from 'lockr';
  import CoreTable from 'kolibri/components/CoreTable';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import CoachAppBarPage from '../CoachAppBarPage';
  import commonCoach from '../common';
  import { coachStrings } from '../common/commonCoachStrings';
  import AssignmentDetailsModal from '../common/assignments/AssignmentDetailsModal';
  import { useLessons } from '../../composables/useLessons';
  import ReportsControls from '../common/ReportsControls';
  import * as csvFields from '../../csv/fields';
  import CSVExporter from '../../csv/exporter';
  import CoachHeader from '../common/CoachHeader.vue';
  import { PageNames } from '../../constants';

  export default {
    name: 'LessonsRootPage',
    components: {
      CoachHeader,
      CoreTable,
      CoachAppBarPage,
      AssignmentDetailsModal,
      ReportsControls,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { show } = useKShow();
      const { entireClassLabel$ } = coachStrings;
      const { lessonsAreLoading } = useLessons();
      const { createSnackbar } = useSnackbar();
      const { windowIsSmall } = useKResponsiveWindow();
      return { show, lessonsAreLoading, createSnackbar, windowIsSmall, entireClassLabel$ };
    },
    data() {
      return {
        showModal: false,
        showLessonIsVisibleModal: false,
        showLessonIsNotVisibleModal: false,
        activeLesson: null,
        filterSelection: {},
        filterRecipents: {
          label: this.entireClassLabel$(),
          value: this.entireClassLabel$(),
        },
        detailsModalIsDisabled: false,
        dontShowAgainChecked: false,
        learnOnlyDevicesExist: false,
        // contains ids of lessons whose visibility
        // status is currently being updated
        updatingVisibilityLessons: {},
      };
    },
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('lessonsRoot', ['lessons', 'learnerGroups']),
      sortedLessons() {
        return this.getFilteredLessons();
      },
      userHasDismissedModal() {
        return Lockr.get(LESSON_VISIBILITY_MODAL_DISMISSED);
      },
      filterOptions() {
        const filters = ['filterLessonAll', 'filterLessonVisible', 'filterLessonNotVisible'];
        return filters.map(filter => ({
          label: this.coachString(filter),
          value: filter,
        }));
      },
      activeLessonCounts() {
        return countBy(this.lessons, 'active');
      },
      newLessonRoute() {
        return { name: PageNames.LESSON_CREATION_ROOT };
      },
      hasVisibleLessons() {
        return this.activeLessonCounts.true;
      },
      hasNonVisibleLessons() {
        return this.activeLessonCounts.false;
      },
      showNoResultsLabel() {
        if (!this.lessons.length) {
          return false;
        } else if (this.filterSelection.value === 'filterLessonVisible') {
          return !this.hasVisibleLessons;
        } else if (this.filterSelection.value === 'filterLessonNotVisible') {
          return !this.hasNonVisibleLessons;
        } else {
          return false;
        }
      },
      calcTotalSizeOfVisibleLessons() {
        if (this.lessons && this.lessons.length) {
          const sum = this.lessons
            .filter(
              // only include visible lessons
              lesson => lesson.active,
            )
            .reduce((acc, lesson) => {
              return acc + (lesson.size || 0);
            }, 0);
          return bytesForHumans(sum);
        }
        return null;
      },
      recipientOptions() {
        const groupOptions = this.groups.map(group => ({
          label: group.name,
          value: group.id,
        }));

        const learnerOptions = this.learners.map(learner => ({
          label: learner.name,
          value: learner.id,
        }));

        return [
          {
            label: this.entireClassLabel$(),
            value: this.entireClassLabel$(),
          },
          ...groupOptions,
          ...learnerOptions,
        ];
      },
    },
    beforeMount() {
      this.filterSelection = this.filterOptions[0];
    },
    mounted() {
      this.checkIfAnyLODsInClass();
    },
    methods: {
      ...mapActions('lessonsRoot', ['createLesson']),
      ...mapActions(['fetchUserSyncStatus']),
      showLesson(lesson) {
        switch (this.filterSelection.value) {
          case 'filterLessonVisible':
            return lesson.active;
          case 'filterLessonNotVisible':
            return !lesson.active;
          default:
            return true;
        }
      },
      lessonSummaryLink({ lessonId }) {
        return this.classRoute(PageNames.LESSON_SUMMARY, { lessonId });
      },
      handleDetailsModalContinue(payload) {
        this.detailsModalIsDisabled = true;
        this.createLesson({
          classId: this.classId,
          payload,
        })
          .then() // If successful, should redirect to LessonSummaryPage
          .catch(error => {
            const errors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
            if (errors) {
              this.$refs.detailsModal.handleSubmitTitleFailure();
            } else {
              this.$refs.detailsModal.handleSubmitFailure();
            }
            this.detailsModalIsDisabled = false;
          });
      },
      // modal about lesson sizes should only exist of LODs exist in the class
      // which we are checking via if there have recently been any user syncs
      // TODO: refactor to a more robust check
      checkIfAnyLODsInClass() {
        this.fetchUserSyncStatus({ member_of: this.$route.params.classId }).then(data => {
          if (data && data.length > 0) {
            this.learnOnlyDevicesExist = true;
          }
        });
      },
      handleToggleVisibility(lesson) {
        const newActiveState = !lesson.active;
        const snackbarMessage = newActiveState
          ? this.coachString('lessonVisibleToLearnersLabel')
          : this.coachString('lessonNotVisibleToLearnersLabel');
        this.manageModalVisibilityAndPreferences();

        set(this.updatingVisibilityLessons, lesson.id, lesson.id);
        return LessonResource.saveModel({
          id: lesson.id,
          data: {
            active: newActiveState,
          },
          exists: true,
        })
          .then(() => {
            return this.$store.dispatch(
              'lessonsRoot/refreshClassLessons',
              this.$route.params.classId,
            );
          })
          .then(() => {
            Vue.delete(this.updatingVisibilityLessons, lesson.id);
            // slightly delay to sync a bit better with the toggle loader
            setTimeout(() => {
              this.createSnackbar(snackbarMessage);
            }, 1000);
          })
          .catch(() => {
            Vue.delete(this.updatingVisibilityLessons, lesson.id);
          });
      },
      isUpdatingVisibility(lessonId) {
        return Object.keys(this.updatingVisibilityLessons).includes(lessonId);
      },
      toggleModal(lesson) {
        // has the user set their preferences to not have a modal confirmation?
        const hideModalConfirmation = Lockr.get(LESSON_VISIBILITY_MODAL_DISMISSED);
        this.activeLesson = lesson;
        if (!hideModalConfirmation && this.learnOnlyDevicesExist) {
          if (lesson.active) {
            this.showLessonIsVisibleModal = false;
            this.showLessonIsNotVisibleModal = true;
          } else {
            this.showLessonIsNotVisibleModal = false;
            this.showLessonIsVisibleModal = true;
          }
        } else {
          // proceed with visibility changes withhout the modal
          this.handleToggleVisibility(lesson);
        }
      },
      manageModalVisibilityAndPreferences() {
        if (this.dontShowAgainChecked) {
          Lockr.set(LESSON_VISIBILITY_MODAL_DISMISSED, true);
        }
        this.activeLesson = null;
        this.showLessonIsVisibleModal = false;
        this.showLessonIsNotVisibleModal = false;
      },
      getFilteredLessons() {
        const sorted = this._.orderBy(this.lessons, ['date_created'], ['desc']);
        const allLessons = sorted.map(lesson => {
          const learners = this.getLearnersForLesson(lesson);
          const sortedLesson = {
            totalLearners: learners.length,
            tally: this.getLessonStatusTally(lesson.id, learners),
            groupNames: this.getGroupNames(lesson.assignments),
            recipientNames: this.getRecipientNamesForLesson(lesson),
            hasAssignments: learners.length > 0,
          };
          Object.assign(sortedLesson, lesson);
          return sortedLesson;
        });

        let lessonToReturn = allLessons;

        if (this.filterSelection.value !== 'filterLessonAll') {
          const isVisibleFilter = this.filterSelection.value === 'filterLessonVisible';
          lessonToReturn = lessonToReturn.filter(lesson => lesson.active === isVisibleFilter);
        }

        if (this.filterRecipents.label !== this.entireClassLabel$()) {
          lessonToReturn = lessonToReturn.filter(lesson => {
            return lesson.recipientNames.includes(this.filterRecipents.label);
          });
        }

        return lessonToReturn;
      },
      exportCSV() {
        const filteredLessons = this.getFilteredLessons();

        const columns = [
          ...csvFields.title(),
          ...csvFields.recipients(this.className),
          ...csvFields.tally(),
          ...csvFields.allLearners('totalLearners'),
        ];
        const fileName = this.$tr('printLabel', { className: this.className });
        new CSVExporter(columns, fileName).export(filteredLessons);
      },
      bytesForHumans,
    },
    $trs: {
      size: {
        message: 'Size',
        context:
          "'Size' is a column name in the 'Lessons' section. It refers to the number or learning resources there are in a specific lesson and the file size of these resources.",
      },
      noLessons: {
        message: 'You do not have any lessons',
        context:
          "Text displayed in the 'Lessons' tab of the coach page if there are no lessons created",
      },
      dontShowAgain: {
        message: "Don't show this message again",
        context: 'Option for a check box to not be prompted again with an informational modal',
      },
      fileSizeToDownload: {
        message: 'File size to download: {size}',
        context:
          'The size of the file or files that must be downloaded to learner devices for the lesson, (i.e. 20 KB)',
      },
      fileSizeToRemove: {
        message: 'File size to remove: {size}',
        context:
          'The size of the file or files that will be removed from learner devices for the lesson, (i.e. 20 KB)',
      },
      printLabel: {
        message: '{className} Lessons',
        context:
          "Title that displays on a printed copy of the Lessons Report. This shows if the user uses the 'Print' option by clicking on the printer icon.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .total-size {
    padding: 0;
    margin-bottom: 16px;
  }

  @media print {
    .lesson-button {
      display: none;
    }
  }

</style>
