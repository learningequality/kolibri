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
      <div :style="{ display: 'flex', alignItems: 'center', gap: '16px' }">
        <KSelect
          v-model="filterSelection"
          :label="filterCourseStatus$()"
          :options="filterOptions"
          :inline="true"
          :style="{
            width: '264px',

          }"
        />
        <KSelect
          v-model="filterRecipients"
          :label="coachString('recipientsLabel')"
          :options="recipientOptions"
          :inline="true"
          :style="{
            width: '264px',
          }"
        />
        <FilterTextbox
          v-model="searchFilter"
          :placeholder="coreString('searchLabel')"
          :aria-label="coreString('searchLabel')"
          :style="{
            width: '269px',
            height: '50px',
          }"
        />
        <KButton
          v-if="hasActiveFilters"
          primary
          appearance="flat-button"
          :text="clearAllFilters$()"
          :style="{
            marginLeft: '2px',

          }"
          @click="clearAllFilters"
        />
      </div>
      <div>
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
                    :tally="course.learnerProgress"
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
                  <div :style="{ height: '28px' }">
                    <KTransition kind="component-fade-out-in">
                      <KCircularLoader
                        v-if="show(course.id, isUpdatingActive(course.id), 2000)"
                        :key="`loader-${course.id}`"
                        disableDefaultTransition
                        :style="{ display: 'inline-block', marginLeft: '6px' }"
                        :size="26"
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
  import { computed, ref, set  } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { CoursesModals, PageNames } from '../../constants';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import CoachHeader from '../common/CoachHeader.vue';
  import StatusSummary from '../common/status/StatusSummary';
  import { overrideRoute } from '../../utils';
  import { useCourses } from '../../composables/useCourses';
  import commonCoach from '../common';
  import { coachStrings } from '../common/commonCoachStrings';
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
      const { courses, coursesAreLoading } = useCourses();
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
        courses,
        coursesAreLoading,
        createSnackbar,
      };
    },
    data() {
      return {
        updatingActiveCourses: {},
        // DEVELOPMENT MODE: Set to true to use dummy data for testing the UI
        // Set to false to use real data from the API
        useDummyData: true,
        searchFilter: '',
        filterSelection: {},
        filterRecipients: {},
      };
    },
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      filterOptions() {
        return [
          { label: this.filterCourseAll$(), value: 'filterCourseAll' },
          { label: this.filterCourseVisible$(), value: 'filterCourseVisible' },
          { label: this.filterCourseNotVisible$(), value: 'filterCourseNotVisible' },
        ];
      },
      recipientOptions() {
        const groupOptions = this.groups.map(group => ({
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
      dummyCourses() {
        return [
          {
            id: 'dummy-1',
            content_id: 'content-1',
            is_active: true,
            date_created: new Date('2024-01-15'),
            assignments: [this.classId],
            learnerProgress: {
              completed: 8,
              started: 5,
              notStarted: 2,
              helpNeeded: 0,
            },
            averageMastery: 0.75,
            totalLearners: 15,
            groupNames: [],
            recipientNames: [],
            contentNode: {
              id: 'content-1',
              title: 'Introduction to Mathematics',
              description: 'A comprehensive course covering basic algebra and geometry',
              channel_id: 'channel-1',
              available: true,
            },
          },
          {
            id: 'dummy-2',
            content_id: 'content-2',
            is_active: false,
            date_created: new Date('2024-01-10'),
            assignments: ['group-1', 'group-2'],
            learnerProgress: {
              completed: 3,
              started: 7,
              notStarted: 4,
              helpNeeded: 0,
            },
            averageMastery: 0.42,
            totalLearners: 14,
            groupNames: ['Group A', 'Group B'],
            recipientNames: ['Group A', 'Group B'],
            contentNode: {
              id: 'content-2',
              title: 'World History 101',
              description: 'Explore major historical events from ancient to modern times',
              channel_id: 'channel-2',
              available: true,
            },
          },
          {
            id: 'dummy-3',
            content_id: 'content-3',
            is_active: true,
            date_created: new Date('2024-01-05'),
            contentMissing: true,
            contentNode: null,
            assignments: [],
            learnerProgress: null,
            averageMastery: null,
            totalLearners: null,
            groupNames: [],
            recipientNames: [],
          },
          {
            id: 'dummy-4',
            content_id: 'content-4',
            is_active: false,
            date_created: new Date('2024-01-01'),
            assignments: [this.classId],
            learnerProgress: {
              completed: 12,
              started: 3,
              notStarted: 0,
              helpNeeded: 0,
            },
            averageMastery: 0.88,
            totalLearners: 15,
            groupNames: [],
            recipientNames: [],
            contentNode: {
              id: 'content-4',
              title: 'Science Fundamentals',
              description: 'Physics, chemistry, and biology basics for beginners',
              channel_id: 'channel-1',
              available: true,
            },
          },
        ];
      },
      hasActiveFilters() {
        const hasSearchFilter = this.searchFilter !== '';
        const hasStatusFilter = this.filterSelection && this.filterSelection.value !== 'filterCourseAll';
        const hasRecipientsFilter = this.filterRecipients && this.filterRecipients.label && this.filterRecipients.label !== this.coreString('allLabel');
        return hasSearchFilter || hasStatusFilter || hasRecipientsFilter;
      },
      sortedCourses() {
        const coursesToUse = this.useDummyData ? this.dummyCourses : this.courses || [];
        let filteredCourses = [...coursesToUse];

        if (this.searchFilter) {
          const searchTerm = this.searchFilter.toLowerCase();
          filteredCourses = filteredCourses.filter(course => {
            if (!course.contentNode) return false;
            return course.contentNode.title.toLowerCase().includes(searchTerm);
          });
        }

        if (this.filterSelection && this.filterSelection.value) {
          if (this.filterSelection.value === 'filterCourseVisible') {
            filteredCourses = filteredCourses.filter(course => course.is_active);
          } else if (this.filterSelection.value === 'filterCourseNotVisible') {
            filteredCourses = filteredCourses.filter(course => !course.is_active);
          }
        }

        if (
          this.filterRecipients &&
          this.filterRecipients.label &&
          this.filterRecipients.label !== this.coreString('allLabel')
        ) {
          if (this.filterRecipients.label !== this.entireClassLabel$()) {
            filteredCourses = filteredCourses.filter(course => {
              return course.recipientNames &&
                course.recipientNames.includes(this.filterRecipients.label);
            });
          } else {
            filteredCourses = filteredCourses.filter(course => {
              return (
                (!course.recipientNames || course.recipientNames.length === 0) &&
                (!course.groupNames || course.groupNames.length === 0)
              );
            });
          }
        }

        return this._.orderBy(filteredCourses,);
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
      isUpdatingActive(courseId) {
        return Object.keys(this.updatingActiveCourses).includes(courseId);
      },
      courseSummaryLink(course) {
        // TODO: Navigate to course summary page when implemented
        return { name: PageNames.COURSES_ROOT, params: { courseId: course.id } };
      },
      formatMastery(mastery) {
        return '—';

      },
      toggleCourseActive(course) {
        const newActiveState = !course.is_active;
        const snackbarMessage = newActiveState
          ? this.courseVisibleToLearnersMessage$()
          : this.courseNotVisibleToLearnersMessage$();

        set(this.updatingActiveCourses, course.id, course.id);
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
            setTimeout(() => {
              this.createSnackbar(snackbarMessage);
            }, 1000);
          })
          .catch(() => {
            Vue.delete(this.updatingActiveCourses, course.id);
            this.createSnackbar(this.courseUpdateError$());
          });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
