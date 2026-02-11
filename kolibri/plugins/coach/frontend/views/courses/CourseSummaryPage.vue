<template>

  <CoachAppBarPage>
    <KPageContainer class="container">
      <KCircularLoader v-if="loading" />
      <div
        v-else
        class="header"
      >
        <KRouterLink
          class="go-back"
          icon="back"
          :text="goBackAction$()"
          appearance="basic-link"
          :to="backRoute"
        />
        <CoachHeader
          hideClassName
          :title="course?.title || ''"
        >
          <template #actions>
            <KButton :text="optionsLabel$()">
              <template #menu>
                <KDropdownMenu
                  :options="[]"
                  maxWidth="none"
                  @select="() => null"
                />
              </template>
            </KButton>
          </template>
        </CoachHeader>
      </div>
      <div
        v-if="!loading"
        class="content"
      >
        <section class="course-status">
          <div class="course-active">
            <KLabeledIcon
              class="status-icon"
              icon="previewUnavailable"
              :label="visibleToLearnersLabel$()"
            />
            <KSwitch
              :value="courseSession.active"
              @change="toggleCourseActive"
            />
          </div>
          <div class="course-class">
            <KLabeledIcon
              class="status-icon"
              icon="classes"
              :label="classLabel$()"
            />
            <div class="icon-aligned-text">{{ courseSession?.classroom?.name }}</div>
          </div>
          <div class="course-recipients">
            <KLabeledIcon
              class="status-icon"
              icon="group"
              :label="recipientsLabel$()"
            />
            <Recipients
              class="icon-aligned-text"
              :groupNames="getRecipientNamesForExam(courseSession)"
              :hasAssignments="courseSession.assignments.length > 0"
            />
          </div>
          <div>
            <KLabeledIcon
              class="status-icon"
              icon="data"
              :label="sizeLabel$()"
            />
            <div class="icon-aligned-text">
              {{ numberOfResources$({ value: course.on_device_resources }) }}
            </div>
          </div>
          <div>
            <KLabeledIcon
              class="status-icon"
              icon="unchecked"
              :label="dateAssigned$()"
            />
            <div class="icon-aligned-text">
              <ElapsedTime :date="new Date(courseSession.date_created)" />
            </div>
          </div>
        </section>
        <section class="course-details">
          <KTabsList
            ref="tabList"
            tabsId="courseTabs"
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
                <div class="active-unit-title">
                  <KRouterLink
                    :text="activeUnit.numberedTitle"
                    :to="{}"
                  />
                  <div class="unit-status">
                    <span
                      class="pill"
                      :style="statusPillStyles"
                    >
                      <KIcon
                        icon="info"
                        :color="$themeTokens.textInverted"
                      />
                      {{ activeUnit$() }}
                    </span>
                    <span class="status-message">
                      <b> {{ unitStatusMessages.boldMessage }} </b>
                      <span style="text-transform: lowercase">{{
                        unitStatusMessages.plainMessage
                      }}</span>
                    </span>
                  </div>
                </div>
                <KButton
                  primary
                  :text="unitStatusMessages.buttonLabel"
                  :style="{ backgroundColor: activeTest ? $themeTokens.error + '!important' : '' }"
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
                      <KRouterLink
                        :text="unit.numberedTitle"
                        :to="{}"
                      />
                      <span>
                        <!-- put end items here -->
                      </span>
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
              <h1>{{ learnersLabel$() }}</h1>
            </template>
            <template #[TABS.OBJECTIVES]>
              <h1>{{ learningObjectivesLabel$() }}</h1>
            </template>
          </KTabsPanel>
        </section>
      </div>
    </KPageContainer>
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
        v-if="activeTest?.status === 'active'"
        class="post-modal-panel"
        :style="{ backgroundColor: $themePalette.grey.v_100 }"
      >
        <div class="panel-item">
          <div class="panel-label">
            {{ completedLabel$() }}
          </div>
          <div class="panel-message">
            {{ nOfMLearners$({ n: 0, m: 10 }) }}
          </div>
        </div>
        <div class="panel-item">
          <div class="panel-label">
            {{ inProgressLabel$() }}
          </div>
          <div class="panel-message">
            {{ numLearners$({ num: 100 }) }}
          </div>
        </div>
      </div>
    </KModal>
  </CoachAppBarPage>

</template>


<script>

  import { computed, ref } from 'vue';
  import { mapGetters } from 'vuex';
  import { useRoute } from 'vue-router/composables';
  import ElapsedTime from 'kolibri-common/components/ElapsedTime';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { PageNames } from '../../constants';
  import Recipients from '../common/Recipients.vue';
  import CoachHeader from '../common/CoachHeader.vue';
  import { coachStrings } from '../../views/common/commonCoachStrings';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import useCourseSession from '../../composables/useCourseSession';
  import { UnitPhase } from '../../constants/courseConstants';

  export default {
    name: 'CourseSummaryPage',
    components: {
      AccordionContainer,
      AccordionItem,
      CoachAppBarPage,
      CoachHeader,
      ElapsedTime,
      Recipients,
    },
    setup() {
      const {
        workingOnLessons$,
        numLearners$,
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
        preTestLabel$,
        lockedLabel$,
        numUnits$,
        unitsLabel$,
        learningObjectivesLabel$,
        readyToStartLabel$,
        completedUnitsLabel$,
        upcomingUnitsLabel$,
        nOfMLearners$,
        activeUnit$,
        visibleToLearnersLabel$,
      } = coursesStrings;

      const { recipientsLabel$, sizeLabel$, numberOfResources$ } = coachStrings;

      const {
        classLabel$,
        learnersLabel$,
        completedLabel$,
        inProgressLabel$,
        goBackAction$,
        optionsLabel$,
      } = coreStrings;

      const route = useRoute();
      const backRoute = computed(() => {
        // include existing route params/query for classId and such if present
        return { ...route, name: PageNames.COURSES_ROOT };
      });

      // Use the composable for all course session state
      const {
        loading,
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
      } = useCourseSession(route.params.courseSessionId);

      // UI-only state
      const activeModal = ref(null);

      const TABS = { UNITS: 'units', LEARNERS: 'learners', OBJECTIVES: 'objectives' };
      const activeTabId = ref(TABS.UNITS);
      const tabs = [
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
      ];

      // Phase-based status messages
      const unitStatusMessages = computed(() => {
        switch (unitPhase.value) {
          case UnitPhase.PRE_TEST_PENDING:
            return {
              boldMessage: preTestLabel$(),
              plainMessage: readyToStartLabel$(),
              buttonLabel: startPreTest$(),
            };
          case UnitPhase.PRE_TEST_ACTIVE:
            return {
              boldMessage: nOfMLearners$({ n: 0, m: 5 }),
              plainMessage: completedLabel$(),
              buttonLabel: endPreTest$(),
            };
          case UnitPhase.POST_TEST_PENDING:
            return {
              boldMessage: nOfMLearners$({ n: 0, m: 5 }),
              plainMessage: workingOnLessons$(),
              buttonLabel: startPostTest$(),
            };
          case UnitPhase.POST_TEST_ACTIVE:
            return {
              boldMessage: nOfMLearners$({ n: 0, m: 5 }),
              plainMessage: completedLabel$(),
              buttonLabel: endPostTest$(),
            };
          case UnitPhase.COMPLETE:
            return {
              boldMessage: '',
              plainMessage: completedLabel$(),
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
        };
      });

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

      // Phase-based button click handler
      function onUnitButtonClick() {
        const unitNum = activeUnitIndex.value + 1;

        switch (unitPhase.value) {
          case UnitPhase.PRE_TEST_PENDING:
            activeModal.value = {
              title: startPreTestForUnitConfirmation$({ num: unitNum }),
              text: startTestForUnitDescription$(),
              submitText: startPreTest$(),
              cancelText: keepRunning$(),
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
              cancelText: keepRunning$(),
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

      return {
        backRoute,
        loading,
        course,
        toggleCourseActive,

        tabs,
        TABS,

        activeTabId,
        activeTest,
        activeUnit,
        activeModal,

        courseSession,
        completedUnits,
        upcomingUnits,
        activeUnitStyles,
        recipientsLabel$,
        sizeLabel$,
        classLabel$,
        visibleToLearnersLabel$,
        unitStatusMessages,
        upcomingUnitsAccordionHeaderStyles,
        numLearners$,
        goBackAction$,
        dateAssigned$,
        optionsLabel$,
        activeUnit$,
        numberOfResources$,
        completedUnitsLabel$,
        numUnits$,
        upcomingUnitsLabel$,
        lockedLabel$,
        learnersLabel$,
        completedLabel$,
        inProgressLabel$,
        nOfMLearners$,

        unitsPillStyles,
        statusPillStyles,
        onUnitButtonClick,
      };
    },
    computed: {
      ...mapGetters('classSummary', ['getRecipientNamesForExam']),
    },
    created() {
      this.$store.dispatch('notLoading');
    },
  };

</script>


<style scoped>

  .container {
    padding: 0;

    .header {
      padding: 8px 24px 24px;
    }
  }

  .go-back {
    margin-top: 16px;
  }

  .content {
    display: flex;
    width: 100%;
  }

  .course-status {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 190px;
    padding: 24px 16px 24px 24px;
    line-height: 140%;
  }

  .icon-aligned-text {
    display: block;
    padding-left: 32px;
  }

  .course-details {
    width: calc(100% - 190px);
  }

  .active-unit {
    display: flex;
    gap: 0;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;

    a {
      font-weight: bold;
    }
  }

  .active-unit-title {
    display: flex;
    flex-direction: column;
    flex-grow: 2;
    gap: 8px;
    width: 75%;
  }

  .pill {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 16px;
  }

  .unit-status {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .upcoming-unit {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
  }

  .post-modal-panel {
    display: flex;
    align-items: center;
    padding: 16px;
    margin-top: 8px;
    border-radius: 8px;

    .panel-item {
      width: 50%;
    }

    .panel-label {
      margin-bottom: 8px;
      font-size: 12px;
      text-transform: uppercase;
    }
  }

  .course-active {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .status-icon {
    font-weight: bold;
  }

</style>
