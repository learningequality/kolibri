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
      <div
        class="filters-container"
        :class="{ 'filters-container-small': windowIsSmall }"
      >
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
                      :text="course.title"
                      icon="course"
                    />
                    <KTextTruncator
                      v-else
                      :text="course.title"
                      :maxLines="1"
                      class="course-title-text"
                    />
                  </div>
                  <KTextTruncator
                    v-if="course.description"
                    :text="course.description"
                    :maxLines="1"
                    class="course-description"
                  />
                </td>
                <td>
                  <span>—</span>
                </td>
                <td>
                  <span>—</span>
                </td>
                <td>
                  <span>
                    {{ formatMastery(course.averageMastery) }}
                  </span>
                </td>
                <td>
                  <div class="visibility-toggle-container">
                    <KTransition kind="component-fade-out-in">
                      <KCircularLoader
                        v-if="show(course.id, isUpdatingActive(course.id), 500)"
                        :key="`loader-${course.id}`"
                        disableDefaultTransition
                      />
                      <KSwitch
                        v-else
                        :key="`switch-${course.id}`"
                        name="toggle-course-visibility"
                        :checked="course.active"
                        :value="course.active"
                        :disabled="course.contentMissing || isUpdatingActive(course.id)"
                        @change="toggleCourseActive(course)"
                      />
                    </KTransition>
                  </div>
                </td>
                <td>
                  <KIconButton icon="optionsVertical">
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
      v-if="courseToDelete"
      :courseTitle="courseToDelete.title"
      @confirm="confirmDeleteCourse"
      @cancel="cancelDeleteCourse"
    />
  </CoachAppBarPage>

</template>


<script>

  import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
  import CoreTable from 'kolibri/components/CoreTable';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import { coreString as translateCoreString } from 'kolibri/uiText/commonCoreStrings';
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { useRoute } from 'vue-router/composables';
  import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { CoursesModals, PageNames } from '../../constants';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import CoachHeader from '../common/CoachHeader.vue';
  import { overrideRoute } from '../../utils';
  import { useCourses } from '../../composables/useCourses';
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
        courseVisibleToLearnersMessage$,
        courseNotVisibleToLearnersMessage$,
        courseUpdateError$,
        filterCourseStatus$,
        filterCourseVisible$,
        filterCourseNotVisible$,
        clearAllFilters$,
        courseDeleted$,
        courseDeleteError$,
      } = coursesStrings;
      const { entireClassLabel$, previewAction$ } = coachStrings;
      const { show } = useKShow();
      const { windowIsSmall } = useKResponsiveWindow();
      const {
        courses: classCourses,
        coursesAreLoading,
        updateCourse,
        removeCourse,
        refreshClassCourses,
      } = useCourses();
      const { createSnackbar } = useSnackbar();
      const updatingCourseIds = ref(new Set());

      const addUpdatingCourseId = courseId => {
        updatingCourseIds.value = new Set([...updatingCourseIds.value, courseId]);
      };

      const removeUpdatingCourseId = courseId => {
        const updated = new Set(updatingCourseIds.value);
        updated.delete(courseId);
        updatingCourseIds.value = updated;
      };

      const assignCourseRoute = computed(() =>
        overrideRoute(route, {
          name: PageNames.COURSES_ASSIGN,
        }),
      );
      const isUpdatingActive = courseId => {
        return updatingCourseIds.value.has(courseId);
      };
      const toggleCourseActive = async course => {
        const newActiveState = !course.active;
        const snackbarMessage = newActiveState
          ? courseVisibleToLearnersMessage$()
          : courseNotVisibleToLearnersMessage$();

        addUpdatingCourseId(course.id);

        try {
          await CourseSessionResource.saveModel({
            id: course.id,
            data: {
              active: newActiveState,
            },
            exists: true,
          });

          // Update local state instead of refetching all courses
          updateCourse(course.id, { active: newActiveState });

          createSnackbar(snackbarMessage);
        } catch (error) {
          createSnackbar(courseUpdateError$());
        } finally {
          removeUpdatingCourseId(course.id);
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
      };

      const confirmDeleteCourse = async () => {
        const course = courseToDelete.value;
        if (!course) return;

        addUpdatingCourseId(course.id);

        try {
          await CourseSessionResource.deleteModel({ id: course.id });
          // Remove course from local state instead of refetching all courses
          removeCourse(course.id);
          createSnackbar(courseDeleted$());
          courseToDelete.value = null;
        } catch (error) {
          createSnackbar(courseDeleteError$());
        } finally {
          removeUpdatingCourseId(course.id);
        }
      };

      const cancelDeleteCourse = () => {
        courseToDelete.value = null;
      };

      const handleCourseMenuSelect = (selection, course) => {
        const previewLabel = previewAction$();
        const editLabel = translateCoreString('editAction');
        const deleteLabel = translateCoreString('deleteAction');

        if (selection === previewLabel) {
          instance.proxy.$router.push(courseSummaryLink(course));
        } else if (selection === editLabel) {
          instance.proxy.$router.push(assignCourseRoute.value);
        } else if (selection === deleteLabel) {
          deleteCourse(course);
        }
      };

      const coreString = (key, args) => translateCoreString(key, args);
      const coachString = (key, args) => coachStrings.$tr(key, args);
      const loadClassData = async classId => {
        await store.dispatch('initClassInfo', classId);
        store.dispatch('notLoading');

        try {
          await refreshClassCourses();
        } catch (error) {
          store.dispatch('handleApiError', { error, reloadOnReconnect: true });
        }
      };

      onMounted(() => {
        loadClassData(route.params.classId);
      });
      watch(
        () => route.params.classId,
        (newClassId, oldClassId) => {
          if (newClassId && newClassId !== oldClassId) {
            loadClassData(newClassId);
          }
        },
      );

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
        filterCourseStatus$,
        filterCourseVisible$,
        filterCourseNotVisible$,
        clearAllFilters$,
        entireClassLabel$,
        show,
        windowIsSmall,
        classCourses,
        coursesAreLoading,
        emptyPlusCloudSvg,
        isUpdatingActive,
        toggleCourseActive,
        confirmDeleteCourse,
        cancelDeleteCourse,
        handleCourseMenuSelect,
        previewAction$,
        coreString,
        coachString,
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
      learnerGroups() {
        return this.$store.getters.groups || [];
      },
      classId() {
        return this.$store.state.classSummary.id;
      },
      courses() {
        const baseCourses = this.classCourses || [];
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
          { label: this.coreString('allLabel'), value: 'filterCourseAll' },
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
            value: '__all__',
          },
          {
            label: this.entireClassLabel$(),
            value: '__entire_class__',
          },
          ...groupOptions,
        ];
      },
      hasCourses() {
        return this.courses && this.courses.length > 0;
      },
      hasActiveFilters() {
        const hasSearchFilter = this.searchFilter !== '';
        const hasStatusFilter =
          this.filterSelection && this.filterSelection.value !== 'filterCourseAll';
        const hasRecipientsFilter =
          this.filterRecipients && this.filterRecipients.value !== '__all__';
        return hasSearchFilter || hasStatusFilter || hasRecipientsFilter;
      },
      showCoursesTable() {
        return (
          this.hasCourses || this.searchFilter || this.hasActiveFilters || this.coursesAreLoading
        );
      },
      sortedCourses() {
        let filteredCourses = [...(this.courses || [])];

        // Apply search filter
        if (this.searchFilter) {
          const searchTerm = this.searchFilter.toLowerCase();
          filteredCourses = filteredCourses.filter(course => {
            const courseTitle = course.title || '';
            return courseTitle.toLowerCase().includes(searchTerm);
          });
        }

        // Apply visibility filter
        if (this.filterSelection && this.filterSelection.value) {
          if (this.filterSelection.value === 'filterCourseVisible') {
            filteredCourses = filteredCourses.filter(course => course.active);
          } else if (this.filterSelection.value === 'filterCourseNotVisible') {
            filteredCourses = filteredCourses.filter(course => !course.active);
          }
        }

        // Apply recipients filter
        if (this.filterRecipients && this.filterRecipients.value !== '__all__') {
          if (this.filterRecipients.value === '__entire_class__') {
            // Show courses assigned to entire class (assignments contains only classId)
            filteredCourses = filteredCourses.filter(course => {
              const assignments = course.assignments || [];
              return assignments.length === 1 && assignments[0] === this.classId;
            });
          } else {
            // Show courses assigned to specific group (value is group.id)
            filteredCourses = filteredCourses.filter(course => {
              const assignments = course.assignments || [];
              return assignments.includes(this.filterRecipients.value);
            });
          }
        }
        return filteredCourses;
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
    gap: 16px;
    align-items: center;
    margin-bottom: 16px;
  }

  .filters-container-small {
    flex-direction: column;
    align-items: stretch;

    .filter-select,
    .filter-search,
    .clear-filters-button {
      width: 100%;
    }

    .filter-search {
      max-width: none;
    }

    .clear-filters-button {
      margin-left: 0;
    }
  }

  .filter-select {
    flex: 0 0 auto;
  }

  .filter-search {
    max-width: 300px;
  }

  .clear-filters-button {
    flex: 0 0 auto;
    margin-left: auto;
    font-weight: 600;
  }

  .course-title {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .course-description {
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.4;
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
