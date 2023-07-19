<template>

  <CoachAppBarPage :authorized="userIsAuthorized" authorizedRole="adminOrCoach" :showSubNav="true">
    <KPageContainer>
      <PlanHeader :activeTabId="PlanTabs.LESSONS" />
      <KTabsPanel
        :tabsId="PLAN_TABS_ID"
        :activeTabId="PlanTabs.LESSONS"
      >
        <p v-if="lessons.length && lessons.length > 0">
          {{ coachString('totalLessonsSize', { size: calcTotalSizeOfVisibleLessons }) }}
        </p>
        <div class="filter-and-button">
          <KSelect
            v-model="filterSelection"
            class="select"
            :label="coachString('filterLessonStatus')"
            :options="filterOptions"
            :inline="true"
          />
          <KRouterLink
            :primary="true"
            appearance="raised-button"
            :text="coachString('newLessonAction')"
            :to="newLessonRoute"
          />
        </div>

        <CoreTable
          :dataLoading="lessonsAreLoading"
          :emptyMessage="$tr('noLessons')"
        >
          <template #headers>
            <th>{{ coachString('titleLabel') }}</th>
            <th>{{ $tr('size') }}</th>
            <th>{{ coachString('recipientsLabel') }}</th>
            <th>{{ coachString('lessonVisibleLabel') }}</th>
          </template>
          <template #tbody>
            <transition-group tag="tbody" name="list">
              <tr v-for="lesson in sortedLessons" v-show="showLesson(lesson)" :key="lesson.id">
                <td>
                  <KRouterLink
                    :to="lessonSummaryLink({ lessonId: lesson.id, classId })"
                    :text="lesson.title"
                    icon="lesson"
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
                    :hasAssignments="
                      lesson.lesson_assignments.length > 0 || lesson.learner_ids.length > 0
                    "
                  />
                </td>
                <td>
                  <KSwitch
                    name="toggle-lesson-visibility"
                    label=""
                    :checked="lesson.is_active"
                    :value="lesson.is_active"
                    @change="toggleModal(lesson)"
                  />
                </td>
              </tr>
            </transition-group>
          </template>
        </CoreTable>

        <p v-if="!hasVisibleLessons">
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
            assignmentType="new_lesson"
            :modalTitleErrorMessage="coachString('duplicateLessonTitleError')"
            :submitErrorMessage="coachString('saveLessonError')"
            :initialDescription="''"
            :initialTitle="''"
            :initialSelectedCollectionIds="[classId]"
            :classId="classId"
            :groups="learnerGroups"
            :disabled="detailsModalIsDisabled"
            @submit="handleDetailsModalContinue"
            @cancel="showModal = false"
          />
        </KModal>
      </KTabsPanel>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import { LessonResource } from 'kolibri.resources';
  import countBy from 'lodash/countBy';
  import {
    LESSON_VISIBILITY_MODAL_DISMISSED,
    ERROR_CONSTANTS,
  } from 'kolibri.coreVue.vuex.constants';
  import Lockr from 'lockr';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import { LessonsPageNames } from '../../../constants/lessonsConstants';
  import { PLAN_TABS_ID, PlanTabs } from '../../../constants/tabsConstants';
  import commonCoach from '../../common';
  import PlanHeader from '../../plan/PlanHeader';
  import AssignmentDetailsModal from '../../plan/assignments/AssignmentDetailsModal';
  import { lessonSummaryLink } from '../../../routes/planLessonsRouterUtils';
  import { useLessons } from '../../../composables/useLessons';

  export default {
    name: 'LessonsRootPage',
    components: {
      PlanHeader,
      CoreTable,
      CoachAppBarPage,
      AssignmentDetailsModal,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { lessonsAreLoading } = useLessons();
      return { lessonsAreLoading };
    },
    data() {
      return {
        PLAN_TABS_ID,
        PlanTabs,
        showModal: false,
        showLessonIsVisibleModal: false,
        showLessonIsNotVisibleModal: false,
        activeLesson: null,
        filterSelection: {},
        detailsModalIsDisabled: false,
        dontShowAgainChecked: false,
        learnOnlyDevicesExist: false,
      };
    },
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('lessonsRoot', ['lessons', 'learnerGroups']),
      sortedLessons() {
        return this._.orderBy(this.lessons, ['date_created'], ['desc']);
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
        return countBy(this.lessons, 'is_active');
      },
      newLessonRoute() {
        return { name: LessonsPageNames.LESSON_CREATION_ROOT };
      },
      hasVisibleLessons() {
        return !(
          !this.activeLessonCounts.true && this.filterSelection.value === 'filterLessonVisible'
        );
      },
      calcTotalSizeOfVisibleLessons() {
        if (this.lessons && this.lessons.length) {
          const sum = this.lessons
            .filter(
              // only include visible lessons
              lesson => lesson.is_active
            )
            .reduce((acc, lesson) => {
              return acc + (lesson.size || 0);
            }, 0);
          return bytesForHumans(sum);
        }
        return null;
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
            return lesson.is_active;
          case 'filterLessonNotVisible':
            return !lesson.is_active;
          default:
            return true;
        }
      },
      lessonSummaryLink,
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
        const newActiveState = !lesson.is_active;
        const snackbarMessage = newActiveState
          ? this.coachString('lessonVisibleToLearnersLabel')
          : this.coachString('lessonNotVisibleToLearnersLabel');
        const promise = LessonResource.saveModel({
          id: lesson.id,
          data: {
            is_active: newActiveState,
          },
          exists: true,
        });
        this.manageModalVisibilityAndPreferences();
        return promise.then(() => {
          this.$store.dispatch('lessonsRoot/refreshClassLessons', this.$route.params.classId);
          this.$store.dispatch('createSnackbar', snackbarMessage);
        });
      },
      toggleModal(lesson) {
        // has the user set their preferences to not have a modal confirmation?
        const hideModalConfirmation = Lockr.get(LESSON_VISIBILITY_MODAL_DISMISSED);
        this.activeLesson = lesson;
        if (!hideModalConfirmation && this.learnOnlyDevicesExist) {
          if (lesson.is_active) {
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
          "Text displayed in the 'Lessons' tab of the 'Plan' section if there are no lessons created",
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
    },
  };

</script>


<style lang="scss" scoped>

  .filter-and-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    margin-bottom: 24px;

    button {
      align-self: flex-end;
    }
  }

</style>
