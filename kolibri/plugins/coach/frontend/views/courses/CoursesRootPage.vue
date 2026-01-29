<template>

  <CoachAppBarPage showSubNav>
    <KPageContainer>
      <CoachHeader :title="coursesLabel$()">
        <template #actions>
          <KRouterLink
            primary
            appearance="raised-button"
            :text="assignCourseAction$()"
            :to="assignCourseRoute"
          />
        </template>
      </CoachHeader>
      <div class="filters-container">
        <KSelect
          v-model="filterSelection"
          :label="filterCourseStatus$()"
          :options="filterOptions"
          :inline="true"
          :disabled="!hasCourses"
          class="filter-select"
        />
        <KSelect
          v-model="filterRecipients"
          :label="coachString('recipientsLabel')"
          :options="recipientOptions"
          :inline="true"
          :disabled="!hasCourses"
          class="filter-select"
        />
        <FilterTextbox
          v-model="searchFilter"
          :placeholder="coreString('searchLabel')"
          :aria-label="coreString('searchLabel')"
          :disabled="!hasCourses"
          class="filter-search"
        />
        <KButton
          v-if="hasActiveFilters"
          primary
          appearance="flat-button"
          :text="clearAllFilters$()"
          class="clear-filters-button"
          @click="clearAllFilters"
        />
      </div>
      <div v-if="showCoursesTable">
        <CoreTable
          :dataLoading="coursesAreLoading"
          :emptyMessage="hasActiveFilters ? coreString('noResultsLabel') : noCoursesAssigned$()"
        >
          <template #headers>
            <th>{{ coachString('titleLabel') }}</th>
            <th>{{ coreString('statusLabel') }}</th>
            <th>{{ coachString('learnersLabel') }}</th>
            <th>{{ masteryLabel$() }}</th>
            <th>{{ visibleLabel$() }}</th>
          </template>
          <template #tbody>
            <transition-group
              tag="tbody"
              name="list"
            >
              <tr
                v-for="course in sortedCourses"
                :key="course.id"
              >
                <td>
                  <KRouterLink
                    v-if="course.contentNode"
                    :to="courseSummaryLink(course)"
                    :text="course.contentNode.title"
                  />
                  <!--  TODO lets add a course icon once its available -->
                  <KLabeledIcon
                    v-else
                    icon="course"
                  >
                    {{ courseNotAvailable$() }}
                  </KLabeledIcon>
                </td>
                <td>
                  <StatusSummary
                    v-if="!course.contentMissing && course.learnerProgress"
                    :progress="course.learnerProgress"
                  />
                  <KLabeledIcon
                    v-else-if="course.contentMissing"
                    icon="warning"
                  >
                    {{ contentNotAvailable$() }}
                  </KLabeledIcon>
                  <span v-else>—</span>
                </td>
                <td>
                  <span v-if="course.totalLearners !== null && course.totalLearners !== undefined">
                    {{ course.totalLearners }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>
                  <span >
                    {{ formatMastery(course.averageMastery) }}
                  </span>
                </td>
                <td>
                  <div class="visibility-toggle-container">
                    <KTransition>
                      <KCircularLoader
                        v-if="show(course.id, isUpdatingActive(course.id))"
                        :key="`loader-${course.id}`"
                        disableDefaultTransition
                      />
                      <KSwitch
                        v-else
                        :key="`switch-${course.id}`"
                        name="toggle-course-visibility"
                        :checked="course.is_active"
                        :value="course.is_active"
                        :disabled="course.contentMissing"
                        @change="toggleCourseActive(course)"
                      />
                    </KTransition>
                  </div>
                </td>
              </tr>
            </transition-group>
          </template>
        </CoreTable>
      </div>
      <div
        v-else
        class="empty-courses"
      >
        <div class="empty-courses-content">
          <KImg
            isDecorative
            :src="emptyPlusCloudSvg"
            backgroundColor="transparent"
          />
          <strong>{{ noCoursesAssigned$() }}</strong>
          <p
            :style="{
              color: $themePalette.grey.v_700,
            }"
          >
            {{ emptyCoursesDescription$() }}
          </p>
        </div>
        <KRouterLink
          primary
          appearance="raised-button"
          :text="assignCourseAction$()"
          :to="assignCourseRoute"
        />
      </div>
    </KPageContainer>
    <!--
      Router view for side panels implemented in courses/sidePanels/...
      whose routes are defined in coach/frontend/routes/coursesRoutes.js
      Side panels will only be rendered when their route is active.
    -->
    <router-view @showModal="modelOpen = $event" />
    <AssignCourseSuccessModal
      v-if="modelOpen === CoursesModals.ASSIGN_COURSE_SUCCESS"
      @close="modelOpen = null"
    />
  </CoachAppBarPage>

</template>


<script>
  import { mapState } from 'vuex';
  import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
  import CoreTable from 'kolibri/components/CoreTable';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { useRoute } from 'vue-router/composables';
  import {  computed, ref } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { CoursesModals, PageNames } from '../../constants';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import CoachHeader from '../common/CoachHeader.vue';
  import StatusSummary from '../common/status/StatusSummary';
  import { overrideRoute } from '../../utils';
  import { useCourses } from '../../composables/useCourses';
  import commonCoach from '../common';
  import { coachStrings } from '../common/commonCoachStrings';
  import emptyPlusCloudSvg from '../../images/empty_plus_cloud.svg';
  import AssignCourseSuccessModal from './modals/AssignCourseSuccess.vue';

  export default {
    name: 'CoursesRootPage',
    components: {
      CoachHeader,
      CoachAppBarPage,
      AssignCourseSuccessModal,
      CoreTable,
      FilterTextbox,
      StatusSummary,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const route = useRoute();
      const modelOpen = ref(null);
      const {
        coursesLabel$,
        assignCourseAction$,
        noCoursesAssigned$,
        emptyCoursesDescription$,
        masteryLabel$,
        visibleLabel$,
        courseNotAvailable$,
        contentNotAvailable$,
        courseVisibleToLearnersMessage$,
        courseNotVisibleToLearnersMessage$,
        courseUpdateError$,
        filterCourseStatus$,
        filterCourseAll$,
        filterCourseVisible$,
        filterCourseNotVisible$,
        clearAllFilters$,
      } = coursesStrings;
      const { entireClassLabel$ } = coachStrings;
      const { show } = useKShow();
      const { courses: storeCourses, coursesAreLoading } = useCourses();
      const { createSnackbar } = useSnackbar();



      const assignCourseRoute = computed(() =>
        overrideRoute(route, {
          name: PageNames.COURSES_ASSIGN,
        }),
      );

      return {
        CoursesModals,
        modelOpen,
        assignCourseRoute,
        coursesLabel$,
        assignCourseAction$,
        noCoursesAssigned$,
        emptyCoursesDescription$,
        masteryLabel$,
        visibleLabel$,
        courseNotAvailable$,
        contentNotAvailable$,
        courseVisibleToLearnersMessage$,
        courseNotVisibleToLearnersMessage$,
        courseUpdateError$,
        filterCourseStatus$,
        filterCourseAll$,
        filterCourseVisible$,
        filterCourseNotVisible$,
        clearAllFilters$,
        entireClassLabel$,
        show,
        storeCourses,
        coursesAreLoading,
        createSnackbar,
        emptyPlusCloudSvg,
      };
    },
    data() {
      return {
        updatingActiveCourses: {},
        searchFilter: '',
        filterSelection: {},
        filterRecipients: {},
      };
    },
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      courses() {
        return this.storeCourses;
      },
      filterOptions() {
        return [
          { label: this.filterCourseAll$(), value: 'filterCourseAll' },
          { label: this.filterCourseVisible$(), value: 'filterCourseVisible' },
          { label: this.filterCourseNotVisible$(), value: 'filterCourseNotVisible' },
        ];
      },
      recipientOptions() {
        const groupOptions = (this.groups || []).map(group => ({
          label: group.name,
          value: group.id,
        }));

        return [
          {
            label: this.coreString('allLabel'),
            value: this.coreString('allLabel'),
          },
          {
            label: this.entireClassLabel$(),
            value: this.entireClassLabel$(),
          },
          ...groupOptions,
        ];
      },
      hasCourses() {
        return this.courses && this.courses.length > 0;
      },
      hasActiveFilters() {
        const hasSearchFilter = this.searchFilter !== '';
        const hasStatusFilter = this.filterSelection && this.filterSelection.value !== 'filterCourseAll';
        const hasRecipientsFilter = this.filterRecipients && this.filterRecipients.label && this.filterRecipients.label !== this.coreString('allLabel');
        return hasSearchFilter || hasStatusFilter || hasRecipientsFilter;
      },
      showCoursesTable() {
        return (
          this.hasCourses ||
          this.searchFilter ||
          this.hasActiveFilters ||
          this.coursesAreLoading
        );
      },
      sortedCourses() {
        let filteredCourses = [...(this.courses || [])];

        // Apply search filter
        if (this.searchFilter) {
          const searchTerm = this.searchFilter.toLowerCase();
          filteredCourses = filteredCourses.filter(course => {
            if (!course.contentNode) return false;
            return course.contentNode.title.toLowerCase().includes(searchTerm);
          });
        }

        // Apply visibility filter
        if (this.filterSelection && this.filterSelection.value) {
          if (this.filterSelection.value === 'filterCourseVisible') {
            filteredCourses = filteredCourses.filter(course => course.is_active);
          } else if (this.filterSelection.value === 'filterCourseNotVisible') {
            filteredCourses = filteredCourses.filter(course => !course.is_active);
          }
        }

        // Apply recipients filter
        if (
          this.filterRecipients &&
          this.filterRecipients.label &&
          this.filterRecipients.label !== this.coreString('allLabel')
        ) {
          if (this.filterRecipients.label === this.entireClassLabel$()) {
            // Show courses assigned to entire class (assignments contains only classId)
            filteredCourses = filteredCourses.filter(course => {
              const assignments = course.assignments || [];
              return assignments.length === 1 && assignments[0] === this.classId;
            });
          } else {
            // Show courses assigned to specific group
            filteredCourses = filteredCourses.filter(course => {
              const groupNames = course.groupNames || [];
              return groupNames.includes(this.filterRecipients.label);
            });
          }
        }
        return (filteredCourses);
      },
    },
    beforeMount() {
      this.filterSelection = this.filterOptions[0];
      this.filterRecipients = this.recipientOptions[0];
    },
    methods: {
      clearAllFilters() {
        this.searchFilter = '';
        this.filterSelection = this.filterOptions[0];
        this.filterRecipients = this.recipientOptions[0];
      },
      /**
       * Check if a course visibility toggle is currently being updated
       * @param {string} courseId
       * @returns {boolean} True if the course is being updated
       */
      isUpdatingActive(courseId) {
        return Object.keys(this.updatingActiveCourses).includes(courseId);
      },
      /**
       * Generate route link to course summary page
       * @param {Object} course - The course object
       * @returns {Object} Route configuration object
       */
      courseSummaryLink(course) {
        return {
          name: PageNames.COURSE_SUMMARY,
          params: {
            classId: this.$route.params.classId,
            courseId: course.id,
          },
        };
      },
      /**
       * Format mastery value as percentage string
       * Currently returns placeholder until mastery calculation is available
       * @param {number|null} mastery - Mastery value between 0 and 1, or null
       * @returns {string} Formatted mastery percentage or em dash
       */
      formatMastery() {
        // TODO: Implement mastery formatting once we figured out mastery calculation
        return '—';
      },
      /**
       * Toggle the active/visibility state of a course
       * Updates the course in the API and refreshes the course list
       * @param {Object} course - The course object to toggle
       */
      toggleCourseActive(course) {
        const newActiveState = !course.is_active;
        const snackbarMessage = newActiveState
          ? this.courseVisibleToLearnersMessage$()
          : this.courseNotVisibleToLearnersMessage$();

        Vue.set(this.updatingActiveCourses, course.id, course.id);
        return CourseSessionResource.saveModel({
          id: course.id,
          data: {
            is_active: newActiveState,
          },
          exists: true,
        })
          .then(() => {
            return this.$store.dispatch(
              'coursesRoot/refreshClassCourses',
              this.$route.params.classId,
            );
          })
          .then(() => {
            Vue.delete(this.updatingActiveCourses, course.id);
            this.createSnackbar(snackbarMessage);
          })
          .catch(() => {
            Vue.delete(this.updatingActiveCourses, course.id);
            this.createSnackbar(this.courseUpdateError$());
          });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .filters-container {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .filter-select {
    width: 264px;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .filter-search {
    width: 269px;
    height: 50px;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .clear-filters-button {
    margin-left: 2px;
  }

  .visibility-toggle-container {
    height: 28px;
  }

  .visibility-loader {
    display: inline-block;
    margin-left: 6px;
  }

  .empty-courses {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 400px;
    padding: 48px 24px;
    text-align: center;

    .empty-courses-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;

      strong {
        margin-top: 24px;
        font-size: 18px;
      }

      p {
        margin: 12px 0 0;
        font-size: 14px;
      }
    }
  }

</style>
