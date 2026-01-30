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
                  <div class="course-title">
                    <KRouterLink
                      v-if="course.contentNode"
                      :to="courseSummaryLink(course)"
                      :text="course.contentNode.title || course.title"
                      icon="course"
                    />
                    <div
                      v-else
                      class="missing-course"
                    >
                      <KLabeledIcon icon="warning">
                        {{ contentNotAvailable$() }}
                      </KLabeledIcon>
                      <span class="course-title-text">
                        {{ course.title || courseNotAvailable$() }}
                      </span>
                    </div>
                  </div>
                  <div
                    v-if="courseDescription(course)"
                    class="course-description"
                  >
                    {{ courseDescription(course) }}
                  </div>
                </td>
                <td>
                  <span v-if="!course.contentMissing && course.learnerProgress">
                    —
                  </span>
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
                    <KTransition kind="fade">
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
                <td>
                  <KIconButton
                    icon="optionsVertical"
                  >
                    <template #menu>
                      <KDropdownMenu
                        :options="courseMenuOptions"
                        @select="selection => handleCourseMenuSelect(selection, course)"
                      />
                    </template>
                  </KIconButton>
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
    <DeleteCourseConfirmationModal
      v-if="modelOpen === CoursesModals.DELETE_COURSE_CONFIRMATION"
      :courseTitle="
        courseToDelete
          ? courseToDelete.contentNode?.title || courseToDelete.title || courseNotAvailable$()
          : ''
      "
      @confirm="confirmDeleteCourse"
      @cancel="cancelDeleteCourse"
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
  import { computed, getCurrentInstance, ref } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { CoursesModals, PageNames } from '../../constants';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import CoachHeader from '../common/CoachHeader.vue';
  import { overrideRoute } from '../../utils';
  import { useCourses } from '../../composables/useCourses';
  import commonCoach from '../common';
  import { coachStrings } from '../common/commonCoachStrings';
  import emptyPlusCloudSvg from '../../images/empty_plus_cloud.svg';
  import AssignCourseSuccessModal from './modals/AssignCourseSuccess.vue';
  import DeleteCourseConfirmationModal from './modals/DeleteCourseConfirmation.vue';

  export default {
    name: 'CoursesRootPage',
    components: {
      CoachHeader,
      CoachAppBarPage,
      AssignCourseSuccessModal,
      DeleteCourseConfirmationModal,
      CoreTable,
      FilterTextbox,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const route = useRoute();
      const instance = getCurrentInstance();
      const store = instance.proxy.$store;
      const modelOpen = ref(null);
      const courseToDelete = ref(null);
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
        deleteCourseConfirmation$,
        courseDeleted$,
        courseDeleteError$,
      } = coursesStrings;
      const { entireClassLabel$, previewAction$ } = coachStrings;
      const { show } = useKShow();
      const {
        courses: storeCourses,
        coursesAreLoading,
        setCourses,
        refreshClassCourses,
      } = useCourses();
      const { createSnackbar } = useSnackbar();

      // Track which courses are currently being updated
      const updatingCourseIds = ref(new Set());

      const assignCourseRoute = computed(() =>
        overrideRoute(route, {
          name: PageNames.COURSES_ASSIGN,
        }),
      );
      const isUpdatingActive = (courseId) => {
        return updatingCourseIds.value.has(courseId);
      };
      const toggleCourseActive = async (course) => {
        const newActiveState = !course.is_active;
        const snackbarMessage = newActiveState
          ? courseVisibleToLearnersMessage$()
          : courseNotVisibleToLearnersMessage$();

        updatingCourseIds.value.add(course.id);

        const previousCourses = [...storeCourses.value];
        const optimisticallyUpdatedCourses = previousCourses.map(c => {
          if (c.id !== course.id) {
            return c;
          }
          return { ...c, is_active: newActiveState };
        });
        setCourses(optimisticallyUpdatedCourses);

        try {
          await CourseSessionResource.saveModel({
            id: course.id,
            data: {
              active: newActiveState,
            },
            exists: true,
          });

          await refreshClassCourses(store, route.params.classId);

          createSnackbar(snackbarMessage);
        } catch (error) {
          setCourses(previousCourses);
          createSnackbar(courseUpdateError$());
        } finally {
          updatingCourseIds.value.delete(course.id);
        }
      };

      const courseSummaryLink = course => {
        return {
          name: PageNames.COURSE_SUMMARY,
          params: {
            classId: route.params.classId,
            courseId: course.id,
          },
        };
      };

      const deleteCourse = course => {
        courseToDelete.value = course;
        modelOpen.value = CoursesModals.DELETE_COURSE_CONFIRMATION;
      };

      const confirmDeleteCourse = async () => {
        const course = courseToDelete.value;
        if (!course) return;

        modelOpen.value = null;

        updatingCourseIds.value.add(course.id);

        const previousCourses = [...storeCourses.value];
        const remainingCourses = previousCourses.filter(({ id }) => id !== course.id);
        setCourses(remainingCourses);

        try {
          await CourseSessionResource.deleteModel({ id: course.id });
          await refreshClassCourses(store, route.params.classId);
          createSnackbar(courseDeleted$());
        } catch (error) {
          setCourses(previousCourses);
          createSnackbar(courseDeleteError$());
        } finally {
          updatingCourseIds.value.delete(course.id);
          courseToDelete.value = null;
        }
      };

      const cancelDeleteCourse = () => {
        modelOpen.value = null;
        courseToDelete.value = null;
      };

      const handleCourseMenuSelect = (selection, course) => {
        const previewLabel = previewAction$();
        const editLabel = instance.proxy.coreString('editAction');
        const deleteLabel = instance.proxy.coreString('deleteAction');

        if (selection === previewLabel) {
          instance.proxy.$router.push(courseSummaryLink(course));
        } else if (selection === editLabel) {
          instance.proxy.$router.push(assignCourseRoute.value);
        } else if (selection === deleteLabel) {
          deleteCourse(course);
        }
      };

      return {
        CoursesModals,
        modelOpen,
        courseToDelete,
        assignCourseRoute,
        courseSummaryLink,
        coursesLabel$,
        assignCourseAction$,
        noCoursesAssigned$,
        emptyCoursesDescription$,
        masteryLabel$,
        visibleLabel$,
        courseNotAvailable$,
        contentNotAvailable$,
        filterCourseStatus$,
        filterCourseAll$,
        filterCourseVisible$,
        filterCourseNotVisible$,
        clearAllFilters$,
        entireClassLabel$,
        show,
        storeCourses,
        coursesAreLoading,
        emptyPlusCloudSvg,
        isUpdatingActive,
        toggleCourseActive,
        deleteCourse,
        confirmDeleteCourse,
        cancelDeleteCourse,
        handleCourseMenuSelect,
        deleteCourseConfirmation$,
        courseDeleted$,
        courseDeleteError$,
        previewAction$,
      };
    },
    data() {
      return {
        searchFilter: '',
        filterSelection: {},
        filterRecipients: {},
      };
    },
    computed: {
      ...mapState('classSummary', { classId: 'id', learnerGroups: 'groups' }),
      courses() {
        const baseCourses = this.storeCourses || [];
        const groupNamesById = (this.learnerGroups || []).reduce((acc, group) => {
          acc[group.id] = group.name;
          return acc;
        }, {});

        return baseCourses.map(course => {
          const assignments = course.assignments || [];
          return {
            ...course,
            assignments,
            groupNames: assignments.map(groupId => groupNamesById[groupId]).filter(Boolean),
          };
        });
      },
      filterOptions() {
        return [
          { label: this.filterCourseAll$(), value: 'filterCourseAll' },
          { label: this.filterCourseVisible$(), value: 'filterCourseVisible' },
          { label: this.filterCourseNotVisible$(), value: 'filterCourseNotVisible' },
        ];
      },
      courseMenuOptions() {
        return [
          this.previewAction$(),
          this.coreString('editAction'),
          this.coreString('deleteAction'),
        ];
      },
      recipientOptions() {
        const groupOptions = (this.learnerGroups || []).map(group => ({
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
            const courseTitle = course.contentNode?.title || course.title || '';
            return courseTitle.toLowerCase().includes(searchTerm);
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
      courseDescription(course) {
        return course.contentNode?.description || course.description || '';
      },
      formatMastery() {
        // TODO: Implement mastery formatting once we figured out mastery calculation
        return '—';
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
    border-radius: 4px;

    @media (max-width: 600px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .filter-select {
    flex: 0 0 auto;
    max-height: 60px;
    max-width: 4000;
    margin: 54px 0;



    @media (max-width: 600px) {
      width: 100%;
    }
  }

  .filter-search {
    max-height: 600px;
    max-width: 4000;
    margin: 54px 0;
  }

  .clear-filters-button {
    flex: 0 0 auto;
    margin-left: auto;
    font-weight: 600;

    @media (max-width: 600px) {
      width: 100%;
      margin-left: 0;
    }
  }

  .visibility-toggle-container {
    height: 28px;
  }

  .visibility-loader {
    display: inline-block;
    margin-left: 6px;
  }

  .course-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .course-description {
    margin-top: 4px;
    color: #606060;
    font-size: 13px;
    line-height: 1.4;
  }

  .missing-course {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .course-title-text {
    font-weight: 600;
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
