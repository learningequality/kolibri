<template>

  <CoachAppBarPage
    :loading="pageLoading"
    showSubNav
  >
    <KPageContainer>
      <MissingResourceAlert
        v-if="anyContentMissing"
        data-testid="missing-resource-alert"
      />
      <CoachHeader :title="coursesLabel$()">
        <template #actions>
          <KButton
            primary
            appearance="raised-button"
            :text="assignCourseAction$()"
            @click="openAssignCourseLink"
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
        <KTable
          :dataLoading="coursesAreLoading"
          :emptyMessage="hasActiveFilters ? coreString('noResultsLabel') : noCoursesAssigned$()"
          :caption="tableCaption"
          :headers="tableHeaders"
          :rows="tableRows"
          :stickyColumns="['first']"
        >
          <template #header="{ header, colIndex }">
            <span
              v-if="colIndex === 5"
              class="visuallyhidden"
            >{{ header.label }}</span>
            <span
              v-else-if="colIndex === 4"
              id="course-visibility-column-header"
              class="table-header-label"
              :style="{ color: $themeTokens.annotation }"
            >{{ header.label }}</span>
            <span
              v-else
              class="table-header-label"
              :style="{ color: $themeTokens.annotation }"
            >{{ header.label }}</span>
          </template>
          <template #cell="{ content, colIndex }">
            <template v-if="colIndex === 0">
              <div class="course-title">
                <KRouterLink
                  :to="courseSummaryLink(content)"
                  :text="content.title"
                  icon="course"
                />
              </div>
            </template>
            <template v-else-if="colIndex === 1">
              <KLabeledIcon nowrap>
                <template #icon>
                  <CoachStatusIcon :icon="iconForPhase(content.unit_phase)" />
                </template>
                <template v-if="content.unit_phase === UnitPhase.PRE_TEST_ACTIVE">
                  {{ preTestRunningLabel$({ num: content.active_unit_number }) }}
                </template>
                <template v-else-if="content.unit_phase === UnitPhase.POST_TEST_ACTIVE">
                  {{ postTestRunningLabel$({ num: content.active_unit_number }) }}
                </template>
                <template v-else-if="content.unit_phase === UnitPhase.POST_TEST_PENDING">
                  {{ unitInProgressLabel$({ num: content.active_unit_number }) }}
                </template>
                <template v-else-if="content.unit_phase === UnitPhase.COMPLETE">
                  {{ coreString('completedLabel') }}
                </template>
                <template v-else>
                  {{ coreString('notStartedLabel') }}
                </template>
              </KLabeledIcon>
            </template>
            <template v-else-if="colIndex === 2">
              <Recipients
                :groupNames="getRecipientNamesForCourseSession(content)"
                :hasAssignments="courseHasRecipients(content)"
              />
            </template>
            <template v-else-if="colIndex === 3">
              <StatusSummary
                v-if="content.test_learner_progress"
                :tally="content.test_learner_progress"
                :verbose="true"
                :showNeedsHelp="false"
              />
              <KEmptyPlaceholder v-else />
            </template>
            <div
              v-else-if="colIndex === 4"
              class="visibility-toggle-container"
            >
              <span
                :id="`course-visibility-label-${content.id}`"
                class="hidden"
                aria-hidden="true"
              >{{ `${content.title} - ${coachString('lessonVisibleLabel')}` }}</span>
              <KTransition kind="component-fade-out-in">
                <KCircularLoader
                  v-if="show(content.id, isUpdatingActive(content.id), 500)"
                  :key="`loader-${content.id}`"
                  disableDefaultTransition
                />
                <KSwitch
                  v-else
                  :key="`switch-${content.id}`"
                  name="toggle-course-visibility"
                  :checked="content.active"
                  :value="content.active"
                  :disabled="content.contentMissing || isUpdatingActive(content.id)"
                  :ariaLabelledBy="`course-visibility-label-${content.id}`"
                  @change="toggleCourseActive(content)"
                />
              </KTransition>
            </div>
            <KIconButton
              v-else-if="colIndex === 5"
              icon="optionsVertical"
              :aria-label="coreString('optionsLabel')"
            >
              <template #menu>
                <KDropdownMenu
                  :options="courseMenuOptions(content)"
                  @select="selection => handleCourseMenuSelect(selection, content)"
                />
              </template>
            </KIconButton>
          </template>
        </KTable>
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
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert.vue';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import { coreString as translateCoreString } from 'kolibri/uiText/commonCoreStrings';
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { handleApiError } from 'kolibri/utils/appError';
  import { useRoute, useRouter } from 'vue-router/composables';
  import { computed, getCurrentInstance, onMounted, ref, watch, nextTick } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import { CoursesModals, PageNames } from '../../constants';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import CoachHeader from '../common/CoachHeader.vue';
  import { overrideRoute } from '../../utils';
  import { useCourses } from '../../composables/useCourses';
  import { coachStrings } from '../common/commonCoachStrings';
  import emptyPlusCloudSvg from '../../images/empty_plus_cloud.svg';
  import useClassSummary from '../../composables/useClassSummary';
  import Recipients from '../common/Recipients.vue';
  import StatusSummary from '../common/status/StatusSummary.vue';
  import CoachStatusIcon from '../common/status/CoachStatusIcon.vue';
  import { UnitPhase } from '../../constants/courseConstants';
  import { ICONS } from '../common/status/constants';
  import useAssignCourse from './composables/useAssignCourse';
  import DeleteCourseConfirmationModal from './modals/DeleteCourseConfirmation.vue';
  import AssignCourseSuccessModal from './modals/AssignCourseSuccess.vue';

  export default {
    name: 'CoursesRootPage',
    components: {
      CoachHeader,
      CoachAppBarPage,
      AssignCourseSuccessModal,
      DeleteCourseConfirmationModal,
      FilterTextbox,
      MissingResourceAlert,
      Recipients,
      StatusSummary,
      CoachStatusIcon,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();
      const instance = getCurrentInstance();
      const store = instance.proxy.$store;
      const modelOpen = ref(null);
      const courseToDelete = ref(null);
      const {
        coursesLabel$,
        assignCourseAction$,
        noCoursesAssigned$,
        emptyCoursesDescription$,
        courseVisibleToLearnersMessage$,
        courseNotVisibleToLearnersMessage$,
        courseUpdateError$,
        filterCourseStatus$,
        filterCourseVisible$,
        filterCourseNotVisible$,
        clearAllFilters$,
        courseDeleted$,
        courseDeleteError$,
        courseDetailsAction$,
        editRecipientsAction$,
        allCoursesForClass$,
        learnerProgressLabel$,
        unitInProgressLabel$,
        preTestRunningLabel$,
        postTestRunningLabel$,
      } = coursesStrings;
      const { entireClassLabel$ } = coachStrings;
      const { getRecipientNamesForCourseSession } = useClassSummary();
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
        const updated = new Set(updatingCourseIds.value);
        updated.add(courseId);
        updatingCourseIds.value = updated;
      };

      const removeUpdatingCourseId = courseId => {
        const updated = new Set(updatingCourseIds.value);
        updated.delete(courseId);
        updatingCourseIds.value = updated;
      };

      const assignCourseComposable = useAssignCourse({
        classId: computed(() => route.params.classId),
      });

      const { selectCourse } = assignCourseComposable;

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
            courseSessionId: course.id,
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

      const openAssignCourseLink = () => {
        assignCourseComposable.resetAssignment();
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN,
          }),
        );
      };

      const openCourseAssignRecipientsLink = () => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_SELECT_RECIPIENTS,
          }),
        );
      };

      const openCourseDetailsLink = course => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_COURSE_DETAILS,
            params: { courseId: course.course },
          }),
        );
      };

      const handleCourseMenuSelect = async (selection, course) => {
        const actions = {
          viewDetails: courseDetailsAction$(),
          edit: editRecipientsAction$(),
          delete: translateCoreString('deleteAction'),
        };

        if (selection === actions.delete) {
          deleteCourse(course);
          return;
        }

        if (selection === actions.viewDetails) {
          assignCourseComposable.resetAssignment();
          assignCourseComposable.setExistingAssignment(course);
          await nextTick();
          openCourseDetailsLink(course);
          return;
        }

        if (selection === actions.edit) {
          try {
            const courseContent = await ContentNodeResource.fetchModel({ id: course.course });
            selectCourse(courseContent);
            assignCourseComposable.setCourseVisibility(course.active);
            assignCourseComposable.setExistingAssignment(course);
            await nextTick();
            openCourseAssignRecipientsLink();
          } catch (e) {
            handleApiError({ error: e });
          }
        }
      };

      const anyContentMissing = computed(() =>
        (classCourses.value || []).some(c => c.contentMissing),
      );

      const coreString = (key, args) => translateCoreString(key, args);
      const coachString = (key, args) => coachStrings.$tr(key, args);
      const loadClassData = async classId => {
        await store.dispatch('initClassInfo', classId);
        pageLoading.value = false;

        try {
          await refreshClassCourses();
        } catch (error) {
          handleApiError({ error, reloadOnReconnect: true });
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

      function courseHasRecipients(course) {
        return (
          (course.assignments && course.assignments.length > 0) ||
          (course.learner_ids && course.learner_ids.length > 0)
        );
      }

      function iconForPhase(phase) {
        if (phase === UnitPhase.COMPLETE) return ICONS.star;
        if (phase === UnitPhase.PRE_TEST_PENDING || !phase) return ICONS.nothing;
        return ICONS.clock;
      }

      return {
        pageLoading,
        CoursesModals,
        modelOpen,
        courseToDelete,
        assignCourseRoute,
        openAssignCourseLink,
        courseSummaryLink,
        coursesLabel$,
        assignCourseAction$,
        noCoursesAssigned$,
        emptyCoursesDescription$,
        filterCourseStatus$,
        filterCourseVisible$,
        filterCourseNotVisible$,
        clearAllFilters$,
        entireClassLabel$,
        show,
        windowIsSmall,
        anyContentMissing,
        classCourses,
        coursesAreLoading,
        emptyPlusCloudSvg,
        isUpdatingActive,
        toggleCourseActive,
        confirmDeleteCourse,
        cancelDeleteCourse,
        handleCourseMenuSelect,
        editRecipientsAction$,
        courseDetailsAction$,
        allCoursesForClass$,
        coreString,
        coachString,
        UnitPhase,
        iconForPhase,
        learnerProgressLabel$,
        unitInProgressLabel$,
        preTestRunningLabel$,
        postTestRunningLabel$,
        getRecipientNamesForCourseSession,
        courseHasRecipients,
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
      className() {
        return this.$store.state.classSummary.name;
      },
      tableCaption() {
        return this.allCoursesForClass$({ className: this.className });
      },
      tableHeaders() {
        return [
          {
            label: this.coachString('titleLabel'),
            dataType: 'string',
            minWidth: '200px',
            columnId: 'title',
          },
          {
            label: this.coreString('progressLabel'),
            dataType: 'undefined',
            minWidth: '100px',
            columnId: 'status',
          },
          {
            label: this.coachString('recipientsLabel'),
            dataType: 'undefined',
            minWidth: '100px',
            columnId: 'recipients',
          },
          {
            label: this.learnerProgressLabel$(),
            dataType: 'undefined',
            minWidth: '100px',
            columnId: 'learnerProgress',
          },
          {
            label: this.coachString('lessonVisibleLabel'),
            dataType: 'undefined',
            minWidth: '200px',
            columnId: 'visible',
          },
          {
            label: this.coreString('optionsLabel'),
            dataType: 'undefined',
            minWidth: '64px',
            columnId: 'options',
          },
        ];
      },
      tableRows() {
        return this.sortedCourses.map(course => [
          course, // title
          course, // status
          course, // recipients
          course, // learner progress
          course, // visible toggle
          course, // options menu
        ]);
      },
      learnerGroups() {
        return this.$store.getters['classSummary/groups'] || [];
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
        return course => {
          if (course.contentMissing) {
            return [this.coreString('deleteAction')];
          }
          return [
            this.courseDetailsAction$(),
            this.editRecipientsAction$(),
            this.coreString('deleteAction'),
          ];
        };
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

  .table-header-label {
    font-size: 12px;
  }

  .course-title {
    display: flex;
    gap: 8px;
    align-items: center;
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
