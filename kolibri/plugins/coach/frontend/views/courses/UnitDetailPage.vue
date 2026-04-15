<template>

  <CoachAppBarPage :pageTitle="coachPageTitle">
    <KPageContainer :topMargin="24">
      <KRouterLink
        v-if="courseTitle"
        class="go-back"
        icon="back"
        :text="backLinkText"
        appearance="basic-link"
        :to="backRoute"
      />
      <KCircularLoader v-if="loading" />
      <template v-else>
        <h1 class="unit-title">
          <KIcon
            icon="course"
            class="unit-icon"
          />
          {{ numberedUnitTitle }}
        </h1>

        <KTabsList
          tabsId="unitDetailTabs"
          :ariaLabel="lessonsLabel$()"
          :activeTabId="activeTabId"
          :tabs="tabs"
          @click="setActiveTab"
        />
        <KTabsPanel
          tabsId="unitDetailTabs"
          :activeTabId="activeTabId"
          :style="tabsPanelStyle"
        >
          <template #[TABS.LESSONS]>
            <AccordionContainer :style="accordionWrapperStyle">
              <template #header="{ canExpandAll, expandAll, canCollapseAll, collapseAll }">
                <div class="accordion-header-actions">
                  <KIconButton
                    icon="expandAll"
                    :tooltip="expandAll$()"
                    :ariaLabel="expandAll$()"
                    :disabled="!canExpandAll"
                    @click="expandAll"
                  />
                  <KIconButton
                    icon="collapseAll"
                    :tooltip="collapseAll$()"
                    :ariaLabel="collapseAll$()"
                    :disabled="!canCollapseAll"
                    @click="collapseAll"
                  />
                </div>
              </template>
              <AccordionItem
                v-for="(lesson, index) in lessons"
                :key="lesson.id"
                :isOpenByDefault="index === 0"
                :headerAppearanceOverrides="lessonHeaderStyles"
              >
                <template #title>
                  <span class="lesson-header-title">
                    <ContentIcon
                      :kind="lesson.kind"
                      class="lesson-icon"
                    />
                    {{ lesson.title }}
                  </span>
                </template>
                <template #content>
                  <table class="resources-table">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          class="visually-hidden"
                        >
                          {{ titleLabel$() }}
                        </th>
                        <th
                          scope="col"
                          class="visually-hidden"
                        >
                          {{ progressLabel$() }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="resource in lesson.resources"
                        :key="resource.id"
                      >
                        <td
                          class="resource-name"
                          :style="windowIsSmall ? { paddingInlineEnd: '24px' } : {}"
                        >
                          <ContentIcon
                            :kind="resource.kind"
                            class="resource-icon"
                          />
                          {{ resource.title }}
                        </td>
                        <td class="resource-status">
                          <StatusSummary
                            :tally="resourceTally(resource.content_id)"
                            :verbose="true"
                            :includeNotStarted="true"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </template>
              </AccordionItem>
            </AccordionContainer>
          </template>

          <template #[TABS.LEARNING_OBJECTIVES]>
            <p
              v-if="activeTestStatus === 'not_activated'"
              class="no-test-notice"
            >
              {{ noTestDataLabel$() }}
            </p>
            <AccordionContainer :style="accordionWrapperStyle">
              <template #header="{ canExpandAll, expandAll, canCollapseAll, collapseAll }">
                <div class="accordion-header-actions">
                  <KIconButton
                    icon="expandAll"
                    :tooltip="expandAll$()"
                    :ariaLabel="expandAll$()"
                    :disabled="!canExpandAll"
                    @click="expandAll"
                  />
                  <KIconButton
                    icon="collapseAll"
                    :tooltip="collapseAll$()"
                    :ariaLabel="collapseAll$()"
                    :disabled="!canCollapseAll"
                    @click="collapseAll"
                  />
                </div>
              </template>
              <AccordionItem
                v-for="(lesson, index) in lessons"
                :key="lesson.id"
                :isOpenByDefault="index === 0"
                :headerAppearanceOverrides="lessonHeaderStyles"
              >
                <template #title>
                  <span class="lesson-header-title">
                    <ContentIcon
                      :kind="lesson.kind"
                      class="lesson-icon"
                    />
                    {{ lesson.title }}
                  </span>
                </template>
                <template #content>
                  <table class="lo-table">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          class="visually-hidden"
                        >
                          {{ learningObjectiveLabel$() }}
                        </th>
                        <th
                          scope="col"
                          class="visually-hidden"
                        >
                          {{ learnerDistributionChartLabel$() }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="objective in objectivesForLesson(lesson.id)"
                        :key="objective.id"
                      >
                        <td
                          class="lo-text"
                          :style="windowIsSmall ? { paddingInlineEnd: '24px' } : {}"
                        >
                          {{ objective.text }}
                        </td>
                        <td class="lo-sparkline">
                          <SparklineBar
                            :lowCount="objective.lowCount"
                            :midCount="objective.midCount"
                            :highCount="objective.highCount"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </template>
              </AccordionItem>
            </AccordionContainer>
          </template>
        </KTabsPanel>
      </template>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import store from 'kolibri/store';
  import ContentIcon from 'kolibri-common/components/labels/ContentIcon';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import { coachStrings } from '../common/commonCoachStrings';
  import { PageNames } from '../../constants';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import useClassSummary from '../../composables/useClassSummary';
  import StatusSummary from '../common/status/StatusSummary.vue';
  import SparklineBar from '../common/SparklineBar.vue';
  import useUnitDetail from '../../composables/useUnitDetail';

  const TABS = {
    LESSONS: 'lessons',
    LEARNING_OBJECTIVES: 'learning_objectives',
  };

  const TAB_ROUTE_NAMES = {
    [TABS.LESSONS]: PageNames.UNIT_DETAIL_LESSONS,
    [TABS.LEARNING_OBJECTIVES]: PageNames.UNIT_DETAIL_OBJECTIVES,
  };

  const ROUTE_NAME_TO_TAB = {
    [PageNames.UNIT_DETAIL_LESSONS]: TABS.LESSONS,
    [PageNames.UNIT_DETAIL_OBJECTIVES]: TABS.LEARNING_OBJECTIVES,
  };

  export default {
    name: 'UnitDetailPage',
    components: {
      AccordionContainer,
      AccordionItem,
      CoachAppBarPage,
      ContentIcon,
      SparklineBar,
      StatusSummary,
    },
    setup() {
      const { learningObjectivesLabel$, learningObjectiveLabel$, noTestDataLabel$ } =
        coursesStrings;
      const { progressLabel$ } = coreStrings;
      const { expandAll$, collapseAll$ } = enhancedQuizManagementStrings;
      const { lessonsLabel$, backToCourseLabel$, titleLabel$, learnerDistributionChartLabel$ } =
        coachStrings;

      store.dispatch('notLoading');

      const route = useRoute();
      const router = useRouter();
      const courseSessionId = computed(() => route.params.courseSessionId);
      const unitContentnodeId = computed(() => route.params.unitContentnodeId);

      const backRoute = computed(() => ({
        name: PageNames.COURSE_SUMMARY,
        params: {
          classId: route.params.classId,
          courseSessionId: courseSessionId.value,
        },
      }));

      const {
        loading,
        lessons,
        courseTitle,
        numberedUnitTitle,
        resourceTally,
        objectivesForLesson,
        activeTestStatus,
      } = useUnitDetail(courseSessionId, unitContentnodeId);

      const { className } = useClassSummary();
      const coachPageTitle = computed(() =>
        [courseTitle.value, className.value].filter(Boolean).join(' - '),
      );

      const backLinkText = computed(() => backToCourseLabel$({ course: courseTitle.value }));

      const { windowIsSmall } = useKResponsiveWindow();

      // Negative margins to bleed the accordion to the edges of KPageContainer,
      // matching KPageContainer's responsive horizontal padding (24px / 16px).
      const accordionWrapperStyle = computed(() => {
        const offset = windowIsSmall.value ? '-16px' : '-24px';
        return { marginInlineStart: offset, marginInlineEnd: offset };
      });

      // On small screens the tabs panel margin must match the accordion's
      // bleed offset so the accordion edges align with the tab bar.
      const tabsPanelStyle = computed(() => ({
        margin: windowIsSmall.value ? '0 16px' : '0 24px',
      }));

      const activeTabId = computed(() => ROUTE_NAME_TO_TAB[route.name] ?? TABS.LESSONS);

      function setActiveTab(id) {
        router.push({ name: TAB_ROUTE_NAMES[id], params: route.params });
      }

      const tabs = computed(() => [
        { id: TABS.LESSONS, label: lessonsLabel$() },
        { id: TABS.LEARNING_OBJECTIVES, label: learningObjectivesLabel$() },
      ]);

      const lessonHeaderStyles = {
        backgroundColor: themePalette().grey.v_100,
        padding: '0px 16px',
        fontWeight: 'bold',
      };

      return {
        TABS,
        loading,
        lessons,
        backRoute,
        activeTabId,
        setActiveTab,
        tabs,
        resourceTally,
        lessonHeaderStyles,
        accordionWrapperStyle,
        tabsPanelStyle,
        windowIsSmall,
        objectivesForLesson,
        coachPageTitle,
        lessonsLabel$,
        progressLabel$,
        titleLabel$,
        learningObjectiveLabel$,
        learnerDistributionChartLabel$,
        backLinkText,
        numberedUnitTitle,
        courseTitle,
        expandAll$,
        collapseAll$,
        activeTestStatus,
        noTestDataLabel$,
      };
    },
  };

</script>


<style scoped>

  .no-test-notice {
    padding: 16px 24px 16px 0;
    margin: 0;
    font-size: 0.875em;
  }

  .accordion-header-actions {
    display: flex;
    justify-content: flex-end;
  }

  .go-back {
    display: block;
    margin: 24px;
  }

  .unit-title {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 24px;
    font-size: 1.5em;
  }

  .lesson-header-title {
    display: flex;
    align-items: center;
    margin: 4px 14px;
    font-weight: 600;
  }

  .lesson-icon {
    margin-inline-end: 8px;
  }

  .resources-table {
    width: 100%;
    font-size: 0.875em;
    table-layout: fixed;
    border-collapse: collapse;
  }

  .resources-table td {
    padding-block: 10px;
    vertical-align: top;
  }

  .resources-table td:first-child {
    width: 65%;
    padding-inline: 20px 8px;
  }

  .resources-table td:last-child {
    width: 35%;
    padding-inline-end: 20px;
  }

  .resource-name {
    display: flex;
    align-items: center;
  }

  .resource-icon {
    flex-shrink: 0;
    margin-inline-end: 8px;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .lo-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }

  .lo-table td {
    padding-block: 10px;
    vertical-align: middle;
  }

  .lo-text {
    width: 60%;
    padding-inline: 20px 8px;
    font-size: 0.875em;
  }

  .lo-sparkline {
    padding-inline-end: 20px;
  }

</style>
