<template>

  <CoachAppBarPage :pageTitle="coachPageTitle">
    <KCircularLoader v-if="pageLoading" />
    <KGrid v-else>
      <!-- Header row (full width) -->
      <KGridItem>
        <KPageContainer style="padding-top: 24px">
          <KRouterLink
            class="go-back"
            icon="back"
            :text="goBackAction$()"
            appearance="basic-link"
            :to="backRoute"
          />
          <div
            class="header"
            :style="headerStyles"
          >
            <h1 class="course-title">
              {{ (course && course.title) || (courseSession && courseSession.title) || '' }}
            </h1>
            <div
             
              v-if="!$isPrint"
              :style="optionsButtonStyles"
            
              :style="optionsButtonStyles"
            >
              <KButton
                :text="optionsLabel$()"
                hasDropdown
              >
                <template #menu>
                  <KDropdownMenu
                    :options="courseMenuOptions"
                    :constrainToScrollParent="false"
                    @select="handleMenuSelect"
                  />
                </template>
              </KButton>
            </div>
          <MissingResourceAlert v-if="contentMissing" />
      </div>
        </KPageContainer>
      </KGridItem>

      <!-- Sidebar (4-span) -->
      <KGridItem :layout12="{ span: $isPrint ? 12 : 4 }">
        <KPageContainer
          v-if="courseSession"
          :topMargin="24"
        >
          <KCircularLoader v-if="dataLoading" />
          <template v-else>
            <div class="course-active status-item">
              <KLabeledIcon
                class="status-icon"
                icon="unlistedchannel"
                :label="visibleToLearnersLabel$()"
              />
              <KSwitch
                :value="courseSession.active"
                :disabled="contentMissing"
              @change="toggleCourseActive"
              />
            </div>
            <div class="status-item">
              <KLabeledIcon
                class="status-icon"
                icon="classes"
                :label="classLabel$()"
              />
              <div class="icon-aligned-text">
                {{ courseSession && courseSession.classroom && courseSession.classroom.name }}
              </div>
            </div>
            <div class="status-item">
              <KLabeledIcon
                class="status-icon"
                icon="group"
                :label="recipientsLabel$()"
              />
              <Recipients
                class="icon-aligned-text"
                :groupNames="getRecipientNamesForCourseSession(courseSession)"
                :hasAssignments="courseSession.assignments.length > 0"
              />
            </div>
            <div class="status-item">
              <KLabeledIcon
                class="status-icon"
                icon="data"
                :label="sizeLabel$()"
              />
              <div class="icon-aligned-text">
                {{ numberOfResources$({ value: course && course.on_device_resources }) }}
              </div>
            </div>
            <div class="status-item">
              <KLabeledIcon
                class="status-icon"
                icon="schedule"
                :label="dateAssigned$()"
              />
              <div class="icon-aligned-text">
                <ElapsedTime :date="new Date(courseSession.date_created)" />
              </div>
            </div>
          </template>
        </KPageContainer>
      </KGridItem>

      <KGridItem :layout12="{ span: $isPrint ? 12 : 8 }">
        <KPageContainer
          v-if="courseSession"
          :topMargin="24"
          class="tabs-list"
        >
          <KTabsList
            ref="tabList"
            tabsId="courseTabs"
            :ariaLabel="unitsLabel$()"
            :activeTabId="activeTabId"
            :tabs="tabs"
            @click="id => (activeTabId = id)"
          />
          <KTabsPanel
            tabsId="courseTabs"
            :activeTabId="activeTabId"
          >
            <template #[TABS.UNITS]>
              <div
                v-if="activeUnit"
                class="active-unit"
                :style="activeUnitStyles"
              >
                <div
                  class="active-unit-title"
                  :style="activeUnitTitleStyles"
                >
                  <!-- TODO: Replace :to with real route once unit detail route is available -->
                  <KRouterLink
                    :text="activeUnit.numberedTitle"
                    :to="{}"
                  />
                  <div class="unit-status">
                    <span
                      class="pill"
                      :style="statusPillStyles"
                    >
                      {{ activeUnit$() }}
                    </span>
                    <span
                      v-if="unitStatusMessages.statusMessage"
                      class="status-message"
                    >
                      {{ unitStatusMessages.statusMessage }}
                    </span>
                  </div>
                </div>
                <KButton
                  primary
                  :text="unitStatusMessages.buttonLabel"
                  :class="$computedClass(testButtonStyles)"
                  :style="activeUnitButtonStyles"
                  @click="onUnitButtonClick"
                />
              </div>
              <AccordionContainer>
                <AccordionItem
                  v-if="completedUnits.length"
                  :title="completedUnitsLabel$()"
                  :headerAppearanceOverrides="upcomingUnitsAccordionHeaderStyles"
                  :contentAppearanceOverrides="{
                    padding: '0',
                  }"
                  isOpenByDefault
                >
                  <template #trailing-actions>
                    <div
                      class="pill"
                      :style="unitsPillStyles"
                    >
                      {{ numUnits$({ num: completedUnits.length || 0 }) }}
                    </div>
                  </template>
                  <template #content>
                    <div
                      v-for="unit in completedUnits"
                      :key="unit.id"
                      class="upcoming-unit"
                      :style="{ border: `1px solid ${$themeTokens.fineLine}` }"
                    >
                      <!-- TODO: Replace :to with real route once unit detail route is available -->
                      <KRouterLink
                        :text="unit.numberedTitle"
                        :to="{}"
                      />
                    </div>
                  </template>
                </AccordionItem>
                <AccordionItem
                  v-if="upcomingUnits.length"
                  :title="upcomingUnitsLabel$()"
                  :headerAppearanceOverrides="upcomingUnitsAccordionHeaderStyles"
                  :contentAppearanceOverrides="{
                    padding: '0 0 48px 0',
                  }"
                  isOpenByDefault
                >
                  <template #content>
                    <div
                      v-for="unit in upcomingUnits"
                      :key="unit.id"
                      class="upcoming-unit"
                      :style="{ border: `1px solid ${$themeTokens.fineLine}` }"
                    >
                      <!-- TODO: Replace :to with real route once unit detail route is available -->
                      <KRouterLink
                        :text="unit.numberedTitle"
                        :to="{}"
                      />
                      <span :style="{ color: $themeTokens.annotation }">
                        <KIcon
                          icon="permissions"
                          :color="$themeTokens.annotation"
                        />
                        {{ lockedLabel$() }}
                      </span>
                    </div>
                  </template>
                </AccordionItem>
              </AccordionContainer>
            </template>
            <template #[TABS.LEARNERS]>
              <div
                v-if="activeUnit"
                class="active-unit"
                :style="activeUnitStyles"
              >
                <div
                  class="active-unit-title"
                  :style="activeUnitTitleStyles"
                >
                  <!-- TODO: Replace :to with real route once unit detail route is available -->
                  <KRouterLink
                    :text="activeUnit.numberedTitle"
                    :to="{}"
                  />
                  <div class="unit-status">
                    <span
                      class="pill"
                      :style="statusPillStyles"
                    >
                      {{ activeUnit$() }}
                    </span>
                    <span
                      v-if="unitStatusMessages.statusMessage"
                      class="status-message"
                    >
                      {{ unitStatusMessages.statusMessage }}
                    </span>
                  </div>
                </div>
              </div>
              <LearnersReport
                :prefetchedData="learnersReportData"
                :learnerRoute="learnerRoute"
              />
            </template>
            <template #[TABS.OBJECTIVES]>
              <div class="learning-objectives-tab">
                <AccordionContainer :key="activeUnit ? activeUnit.id : 'complete'">
                  <AccordionItem
                    v-for="unit in allUnits"
                    :key="unit.id"
                    :title="unitObjectiveTitle(unit)"
                    :headerAppearanceOverrides="courseObjectiveheaderstyle"
                    class="objective-accordion-item"
                    :contentAppearanceOverrides="{
                      padding: '0',
                    }"
                    :isOpenByDefault="activeUnit && activeUnit.id === unit.id"
                  >
                    <template #content>
                      <LearningObjectivesReport
                        :prefetchedData="unitReportInfo[unit.id]"
                        @select-objective="onSelectObjective"
                      />
                    </template>
                  </AccordionItem>
                </AccordionContainer>
              </div>
            </template>
          </KTabsPanel>
        </KPageContainer>
      </KGridItem>
    </KGrid>

    <!--
      Router allow us access to the course side panels (CourseDetails, SelectRecipients)
      defined as children of COURSE_SUMMARY (in addition to assign courses) in coursesRoutes.js
    -->
    <router-view />

    <KModal
      v-if="showDeleteModal"
      :title="deleteCourseFromSummaryTitle$()"
      :submitText="deleteAction$()"
      :cancelText="cancelAction$()"
      @cancel="showDeleteModal = false"
      @submit="confirmDeleteCourse"
    >
      <p>{{ deleteCourseFromSummaryConfirmation$() }}</p>
    </KModal>

    <KModal
      v-if="activeModal"
      :title="activeModal.title"
      :submitText="activeModal.submitText"
      :cancelText="activeModal.cancelText"
      @cancel="activeModal.cancel"
      @submit="activeModal.submit"
    >
      <div>{{ activeModal.text }}</div>
      <div
        v-if="activeTest && activeTest.status === 'active'"
        class="post-modal-panel"
        :style="{ backgroundColor: $themePalette.grey.v_100 }"
      >
        <div class="panel-item">
          <div class="panel-label">
            {{ completedLabel$() }}
          </div>
          <div class="panel-message">
            {{
              nOfMLearnersCompleted$({ n: activeModalCompletedCount, m: activeUnitTotalLearners })
            }}
          </div>
        </div>
        <div class="panel-item">
          <div class="panel-label">
            {{ inProgressLabel$() }}
          </div>
          <div class="panel-message">
            {{ numLearners$({ num: activeModalInProgressCount }) }}
          </div>
        </div>
      </div>
    </KModal>
    <LearnerSidePanel
      v-if="selectedLearner"
      :prefetchedData="learnersReportData"
      :learner="selectedLearner"
      @close="closeLearnerPanel"
    />
    <LearningObjectiveSidePanel
      v-if="selectedObjective"
      :objective="selectedObjective.objective"
      :reportData="selectedObjective.reportData"
      @closePanel="onClosePanel"
    />
  </CoachAppBarPage>

</template>


<script>

  import { computed, ref, watch, nextTick } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import ElapsedTime from 'kolibri-common/components/ElapsedTime';
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert.vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { isRtl, currentLanguage } from 'kolibri/utils/i18n';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import store from 'kolibri/store';
  import { PageNames } from '../../constants';
  import Recipients from '../common/Recipients.vue';
  import { coachStrings } from '../../views/common/commonCoachStrings';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import useCourseSession from '../../composables/useCourseSession';
  import useClassSummary from '../../composables/useClassSummary.js';
  import { UnitPhase } from '../../constants/courseConstants';
  import UnitReportResource from '../../apiResources/unitReport';
  import { deriveUnitReportInfo } from '../../utils/scoreBucketing';
  import { overrideRoute } from '../../utils';
  import useAssignCourse from './composables/useAssignCourse';
  import LearningObjectivesReport from './LearningObjectivesReport.vue';
  import LearnersReport from './LearnersReport.vue';
  import LearnerSidePanel from './LearnerSidePanel.vue';
  import LearningObjectiveSidePanel from './LearningObjectiveSidePanel.vue';

  export default {
    name: 'CourseSummaryPage',
    components: {
      AccordionContainer,
      AccordionItem,
      CoachAppBarPage,
      ElapsedTime,
      LearnerSidePanel,
      LearningObjectivesReport,
      LearnersReport,
      LearningObjectiveSidePanel,
      MissingResourceAlert,
      Recipients,
    },
    setup() {
      const {
        nOfMLearnersWorkingOnLessons$,
        nOfMLearnersCompleted$,
        startPreTest$,
        startPostTest$,
        dateAssigned$,
        endPreTest$,
        endPostTest$,
        startTestForUnitDescription$,
        endTestForUnitDescription$,
        startPreTestForUnitConfirmation$,
        startPostTestForUnitConfirmation$,
        endPreTestForUnitConfirmation$,
        endPostTestForUnitConfirmation$,
        keepRunning$,
        lockedLabel$,
        numUnits$,
        unitsLabel$,
        learningObjectivesLabel$,
        completedUnitsLabel$,
        upcomingUnitsLabel$,
        activeUnit$,
        visibleToLearnersLabel$,
        preTestInProgress$,
        preTestResults$,
        postTestInProgress$,
        postTestResults$,
        unitTitleWithStatus$,
        courseDetailsAction$,
        editRecipientsAction$,
        courseDeleted$,
        courseDeleteError$,
        deleteCourseFromSummaryTitle$,
        deleteCourseFromSummaryConfirmation$,
      } = coursesStrings;

      const { recipientsLabel$, sizeLabel$, numberOfResources$ } = coachStrings;

      const {
        classLabel$,
        learnersLabel$,
        completedLabel$,
        inProgressLabel$,
        goBackAction$,
        optionsLabel$,
        cancelAction$,
        deleteAction$,
        defaultErrorMessage$,
      } = coreStrings;

      const { windowIsSmall } = useKResponsiveWindow();

      const route = useRoute();
      const router = useRouter();
      const { createSnackbar } = useSnackbar();
      const backRoute = computed(() => {
        // include existing route params/query for classId and such if present
        return { ...route, name: PageNames.COURSES_ROOT };
      });

      const courseSessionId = computed(() => route.params.courseSessionId);

      // Use the composable for all course session state
      const {
        contentMissing,
        dataLoading,
        pageLoading,
        course,
        activeTest,
        activeUnit,
        activeUnitIndex,
        completedUnits,
        upcomingUnits,
        unitPhase,
        activateTest,
        closeTest,
        courseSession,
        toggleCourseActive,
        units,
      } = useCourseSession(courseSessionId);
      const allUnits = computed(() => units.value || []);

      const { getRecipientNamesForCourseSession, className } = useClassSummary();
      const { removeCourse } = useCourses();

      const coachPageTitle = computed(() => {
        const parts = [course.value?.title, className.value].filter(Boolean);
        if (isRtl(currentLanguage)) parts.reverse();
        return parts.join(' - ');
      });

      // Learner counts derived from the active unit's report
      // (activeUnitReport is defined below after unitReportInfo is set up)
      const activeUnitLearnerStats = computed(() => {
        const reportData = unitReportInfo.value[activeUnit.value?.id]?.reportData;
        if (!reportData) return { total: 0, preTestCompleted: 0, postTestCompleted: 0 };
        return {
          total: reportData.learners?.length || 0,
          preTestCompleted: Object.keys(reportData.pre_test?.scores || {}).length,
          postTestCompleted: Object.keys(reportData.post_test?.scores || {}).length,
        };
      });

      // Set up provide/inject for the assign-course side panel
      const assignCourse = useAssignCourse({
        classId: computed(() => route.params.classId),
      });

      // Options dropdown menu
      const courseMenuOptions = computed(() => [
        courseDetailsAction$(),
        editRecipientsAction$(),
        deleteAction$(),
      ]);

      const showDeleteModal = ref(false);

      const confirmDeleteCourse = async () => {
        if (!courseSession.value) return;
        try {
          await CourseSessionResource.deleteModel({ id: courseSession.value.id });
          createSnackbar(courseDeleted$());
          router.push(backRoute.value);
        } catch {
          createSnackbar(courseDeleteError$());
        }
        showDeleteModal.value = false;
      };

      const handleMenuSelect = async selection => {
        if (selection === deleteAction$()) {
          showDeleteModal.value = true;
          return;
        }

        if (selection === courseDetailsAction$()) {
          assignCourse.resetAssignment();
          assignCourse.setExistingAssignment(courseSession.value);
          await nextTick();
          router.push(
            overrideRoute(route, {
              name: PageNames.COURSE_SUMMARY_ASSIGN_COURSE_DETAILS,
              params: { courseId: course.value.id },
            }),
          );
          return;
        }

        if (selection === editRecipientsAction$()) {
          try {
            const courseContent = await ContentNodeResource.fetchModel({
              id: courseSession.value.course,
            });
            assignCourse.selectCourse(courseContent);
            assignCourse.setCourseVisibility(courseSession.value.active);
            assignCourse.setExistingAssignment(courseSession.value);
            await nextTick();
            router.push(
              overrideRoute(route, {
                name: PageNames.COURSE_SUMMARY_ASSIGN_SELECT_RECIPIENTS,
              }),
            );
          } catch (e) {
            createSnackbar(defaultErrorMessage$());
          }
        }
      };

      // UI-only state
      const activeModal = ref(null);
      const selectedLearner = ref(null);
      const selectedObjective = ref(null);

      function onSelectObjective(data) {
        selectedObjective.value = data;
      }

      function onClosePanel() {
        selectedObjective.value = null;
      }

      // Per-unit report data fetched eagerly for LO report and titles
      const unitReportInfo = ref({});

      function fetchAllUnitReports() {
        const sessionId = courseSessionId.value;
        const unitList = allUnits.value;
        if (!sessionId || !unitList.length) return;
        const getGroupNames = store.getters['classSummary/getGroupNamesForLearner'];
        for (const unit of unitList) {
          UnitReportResource.fetchReport({
            courseSessionId: sessionId,
            unitContentnodeId: unit.id,
          })
            .then(data => {
              unitReportInfo.value = {
                ...unitReportInfo.value,
                [unit.id]: {
                  ...deriveUnitReportInfo(data),
                  reportData: { ...data, unit_title: unit.numberedTitle },
                  learnersWithGroups: data.learners.map(learner => ({
                    ...learner,
                    groups: getGroupNames(learner.id),
                  })),
                },
              };
            })
            .catch(error => {
              store.dispatch('handleApiError', { error });
              unitReportInfo.value = {
                ...unitReportInfo.value,
                [unit.id]: {
                  activeTestType: null,
                  activeTestStatus: 'not_activated',
                  bucketedObjectives: [],
                  reportData: null,
                  learnersWithGroups: [],
                },
              };
            });
        }
      }

      // Fetch reports when units become available
      watch(
        allUnits,
        () => {
          if (allUnits.value.length) {
            fetchAllUnitReports();
          }
        },
        { immediate: true },
      );

      const activeUnitReport = computed(() => unitReportInfo.value[activeUnit.value?.id] || null);
      const activeUnitTotalLearners = computed(
        () => activeUnitReport.value?.learnersWithGroups?.length || 0,
      );

      function activeUnitScoreCount(testKey) {
        return Object.keys(activeUnitReport.value?.reportData?.[testKey]?.scores || {}).length;
      }

      const activeModalTestKey = computed(() =>
        activeUnitReport.value?.activeTestType === 'post' ? 'post_test' : 'pre_test',
      );
      const activeModalCompletedCount = computed(() =>
        activeUnitScoreCount(activeModalTestKey.value),
      );
      const activeModalInProgressCount = computed(
        () => activeUnitTotalLearners.value - activeModalCompletedCount.value,
      );

      function unitObjectiveTitle(unit) {
        const info = unitReportInfo.value[unit.id];
        if (!info || !info.activeTestType) {
          return unit.numberedTitle;
        }
        let statusLabel;
        if (info.activeTestType === 'pre') {
          statusLabel = info.activeTestStatus === 'open' ? preTestInProgress$() : preTestResults$();
        } else if (info.activeTestType === 'post') {
          statusLabel =
            info.activeTestStatus === 'open' ? postTestInProgress$() : postTestResults$();
        }
        if (!statusLabel) {
          return unit.numberedTitle;
        }
        return unitTitleWithStatus$({ title: unit.numberedTitle, status: statusLabel });
      }

      const courseObjectiveheaderstyle = computed(() => {
        return {
          backgroundColor: themePalette().grey.v_100,
          padding: '0px 16px',
          fontWeight: 'bold',
          fontSize: '16px',
        };
      });

      const TABS = { UNITS: 'units', LEARNERS: 'learners', OBJECTIVES: 'objectives' };
      const activeTabId = ref(TABS.UNITS);
      const tabs = computed(() => [
        {
          id: TABS.UNITS,
          label: unitsLabel$(),
        },
        {
          id: TABS.LEARNERS,
          label: learnersLabel$(),
        },
        {
          id: TABS.OBJECTIVES,
          label: learningObjectivesLabel$(),
        },
      ]);

      // Re-fetch when switching to the Learning Objectives tab so that
      // test state changes made on the Units tab are reflected immediately.
      watch(activeTabId, newTab => {
        if (newTab === TABS.OBJECTIVES) {
          fetchAllUnitReports();
        }
      });

      // Phase-based status messages
      const unitStatusMessages = computed(() => {
        const { preTestCompleted, postTestCompleted, total } = activeUnitLearnerStats.value;
        switch (unitPhase.value) {
          case UnitPhase.PRE_TEST_PENDING:
            // No status message for the initial pre-test pending state
            return { buttonLabel: startPreTest$() };
          case UnitPhase.PRE_TEST_ACTIVE:
            return {
              statusMessage: nOfMLearnersCompleted$({ n: preTestCompleted, m: total }),
              buttonLabel: endPreTest$(),
            };
          case UnitPhase.POST_TEST_PENDING:
            return {
              statusMessage: nOfMLearnersWorkingOnLessons$({ n: preTestCompleted, m: total }),
              buttonLabel: startPostTest$(),
            };
          case UnitPhase.POST_TEST_ACTIVE:
            return {
              statusMessage: nOfMLearnersCompleted$({ n: postTestCompleted, m: total }),
              buttonLabel: endPostTest$(),
            };
          case UnitPhase.COMPLETE:
            return {
              statusMessage: completedLabel$(),
              buttonLabel: '',
            };
          default:
            return {};
        }
      });

      // Phase-based styles
      const activeUnitStyles = computed(() => {
        const isTestActive =
          unitPhase.value === UnitPhase.PRE_TEST_ACTIVE ||
          unitPhase.value === UnitPhase.POST_TEST_ACTIVE;
        return {
          backgroundColor: isTestActive ? themePalette().yellow.v_100 : themePalette().blue.v_100,
          flexDirection: windowIsSmall.value ? 'column' : 'row',
          alignItems: windowIsSmall.value ? 'flex-start' : 'center',
          gap: windowIsSmall.value ? '12px' : '0',
        };
      });

      // On small screens the title should stretch to full width; on larger screens
      // the CSS width: 75% rule in .active-unit-title takes effect.
      const activeUnitTitleStyles = computed(() => (windowIsSmall.value ? { width: '100%' } : {}));

      // On small screens the action button should be full-width.
      const activeUnitButtonStyles = computed(() => (windowIsSmall.value ? { width: '100%' } : {}));

      const statusPillStyles = computed(() => {
        const isTestActive =
          unitPhase.value === UnitPhase.PRE_TEST_ACTIVE ||
          unitPhase.value === UnitPhase.POST_TEST_ACTIVE;
        return {
          backgroundColor: isTestActive ? themePalette().orange.v_600 : themePalette().blue.v_600,
          color: themeTokens().textInverted,
        };
      });

      const unitsPillStyles = {
        backgroundColor: themeTokens().surface,
        fontWeight: 'normal',
      };

      const upcomingUnitsAccordionHeaderStyles = computed(() => {
        return {
          backgroundColor: themePalette().grey.v_100,
          padding: '0px 16px',
          fontWeight: 'bold',
        };
      });

      const headerStyles = computed(() => ({
        flexDirection: windowIsSmall.value ? 'column' : 'row',
        alignItems: windowIsSmall.value ? 'flex-start' : 'center',
      }));

      // Phase-based button click handler
      function onUnitButtonClick() {
        const unitNum = activeUnitIndex.value + 1;

        switch (unitPhase.value) {
          case UnitPhase.PRE_TEST_PENDING:
            activeModal.value = {
              title: startPreTestForUnitConfirmation$({ num: unitNum }),
              text: startTestForUnitDescription$(),
              submitText: startPreTest$(),
              cancelText: cancelAction$(),
              submit: () => {
                activateTest('pre');
                activeModal.value = null;
              },
              cancel: () => (activeModal.value = null),
            };
            break;
          case UnitPhase.PRE_TEST_ACTIVE:
            activeModal.value = {
              title: endPreTestForUnitConfirmation$({ num: unitNum }),
              text: endTestForUnitDescription$(),
              submitText: endPreTest$(),
              cancelText: keepRunning$(),
              submit: () => {
                closeTest();
                activeModal.value = null;
              },
              cancel: () => (activeModal.value = null),
            };
            break;
          case UnitPhase.POST_TEST_PENDING:
            activeModal.value = {
              title: startPostTestForUnitConfirmation$({ num: unitNum }),
              text: startTestForUnitDescription$(),
              submitText: startPostTest$(),
              cancelText: cancelAction$(),
              submit: () => {
                activateTest('post');
                activeModal.value = null;
              },
              cancel: () => (activeModal.value = null),
            };
            break;
          case UnitPhase.POST_TEST_ACTIVE:
            activeModal.value = {
              title: endPostTestForUnitConfirmation$({ num: unitNum }),
              text: endTestForUnitDescription$(),
              submitText: endPostTest$(),
              cancelText: keepRunning$(),
              submit: () => {
                closeTest();
                activeModal.value = null;
              },
              cancel: () => (activeModal.value = null),
            };
            break;
        }
      }

      const testButtonStyles = computed(() => {
        const color = activeTest.value ? themeTokens().error : '';
        return {
          background: color,
          ':hover': {
            background: color,
          },
        };
      });

      // Flat learner data for the Learners tab: prefer active unit, else first unit with data
      const learnersReportData = computed(() => {
        if (activeUnit.value) {
          const info = unitReportInfo.value[activeUnit.value.id];
          if (info) return info;
        }
        for (const unit of allUnits.value) {
          const info = unitReportInfo.value[unit.id];
          if (info && info.activeTestStatus !== 'not_activated') return info;
        }
        for (const unit of allUnits.value) {
          const info = unitReportInfo.value[unit.id];
          if (info) return info;
        }
        return null;
      });

      // Sync selectedLearner with route query — supports deep-linking to a learner panel
      watch([() => route.query.learnerId, learnersReportData], ([learnerId]) => {
        if (!learnerId) {
          selectedLearner.value = null;
          return;
        }
        const learner = learnersReportData.value?.learnersWithGroups?.find(l => l.id === learnerId);
        selectedLearner.value = learner || null;
      });

      function learnerRoute(learner) {
        return {
          name: route.name,
          params: { ...route.params },
          query: { ...route.query, learnerId: learner.id },
        };
      }

      function closeLearnerPanel() {
        const restQuery = { ...route.query };
        delete restQuery.learnerId;
        router.replace({
          name: route.name,
          params: { ...route.params },
          query: restQuery,
        });
      }

      return {
        coachPageTitle,
        backRoute,
        contentMissing,
        dataLoading,
        pageLoading,
        course,
        toggleCourseActive,

        tabs,
        TABS,

        activeTabId,
        activeTest,
        activeUnit,
        activeModal,
        selectedLearner,

        courseSession,
        completedUnits,
        upcomingUnits,
        testButtonStyles,
        activeUnitStyles,
        activeUnitTitleStyles,
        activeUnitButtonStyles,
        recipientsLabel$,
        sizeLabel$,
        classLabel$,
        visibleToLearnersLabel$,
        unitStatusMessages,
        upcomingUnitsAccordionHeaderStyles,
        goBackAction$,
        dateAssigned$,
        optionsLabel$,
        activeUnit$,
        numberOfResources$,
        completedUnitsLabel$,
        unitsLabel$,
        numUnits$,
        upcomingUnitsLabel$,
        lockedLabel$,
        completedLabel$,
        inProgressLabel$,
        getRecipientNamesForCourseSession,

        headerStyles,
        unitsPillStyles,
        statusPillStyles,
        onUnitButtonClick,
        allUnits,
        courseObjectiveheaderstyle,
        unitReportInfo,
        unitObjectiveTitle,
        learnersReportData,
        learnerRoute,
        closeLearnerPanel,
        activeUnitTotalLearners,
        activeModalCompletedCount,
        activeModalInProgressCount,
        selectedObjective,
        onSelectObjective,
        onClosePanel,

        courseMenuOptions,
        showDeleteModal,
        confirmDeleteCourse,
        handleMenuSelect,
        deleteCourseFromSummaryTitle$,
        deleteCourseFromSummaryConfirmation$,
        deleteAction$,
      };
    },
    watch: {
      courseSession() {
        this.$store.dispatch('notLoading');
      },
      // When the side panel closes and the route returns to COURSE_SUMMARY, the page
      // is already mounted and courseSession hasn't changed, so the watcher above won't
      // fire. This catches that case and clears the loading state set by the global guard.
      '$route.name'(name) {
        if (name === 'COURSE_SUMMARY' && this.courseSession) {
          this.$store.dispatch('notLoading');
        }
      },
    },
  };

</script>


<style scoped>

  .container {
    padding: 0;
  }

  .container .header {
    padding: 8px 24px 24px;
  }

  .go-back {
    margin-top: 8px;
  }

  .header {
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-top: 16px;
  }

  .tabs-list {
    padding: 0;
    padding-top: 12px;
  }

  .course-title {
    margin-top: 0;
    margin-bottom: 0;
  }

  .status-item {
    margin-bottom: 16px;
    line-height: 140%;
  }

  .course-active {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
  }

  .icon-aligned-text {
    display: block;
    padding-left: 32px;
  }

  .status-icon {
    font-weight: bold;
  }

  .active-unit {
    display: flex;
    gap: 0;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    font-size: 14px;
  }

  .active-unit a {
    font-weight: bold;
  }

  .pill {
    flex-shrink: 0;
    padding: 4px 12px;
    padding-bottom: 5px;
    font-size: 12px;
    white-space: nowrap;
    border-radius: 16px;
  }

  .unit-status {
    display: flex;
    gap: 16px;
    align-items: center;
    font-size: 13px;
  }

  .status-message {
    flex: 1 1 0;
    min-width: 0;
  }

  .active-unit-title {
    display: flex;
    flex-direction: column;
    flex-grow: 2;
    gap: 8px;
    width: 75%;
    font-size: 16px;
  }

  .upcoming-unit {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    font-size: 14px;
    border-right: unset !important;
    border-left: unset !important;
  }

  .post-modal-panel {
    display: flex;
    align-items: center;
    padding: 16px;
    margin-top: 8px;
    border-radius: 8px;
  }

  .panel-item {
    width: 50%;
  }

  .panel-label {
    margin-bottom: 8px;
    font-size: 12px;
    text-transform: uppercase;
  }

  .status-plain-message {
    text-transform: lowercase;
  }

  .learning-objectives-tab {
    td {
      padding: 0;
    }
  }

  .objective-accordion-item {
    font-size: 14px;
  }

</style>
