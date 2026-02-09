<template>

  <CoachAppBarPage>
    <KPageContainer class='container'>
      <KCircularLoader v-if="loading" />
      <div v-else class='header'>
        <KButton class='go-back' text='<- Back' appearance="basic-link" />
        <CoachHeader  hideClassName :title="course?.title || ''">
          <template #actions>
            <KButton text="Options" >
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
      <div v-if="!loading" class="content">
        <section class="course-status">
          oh snap
        </section>
        <section class="course-details">
          <KTabsList
            ref="tabList"
            tabsId="courseTabs"
            :activeTabId="activeTabId"
            :tabs="tabs"
            @click="id => activeTabId = id"
          />
          <KTabsPanel
            tabsId="courseTabs"
            :activeTabId="activeTabId"
          >
            <template #[TABS.UNITS]>
              <div class='active-unit' :style="activeUnitStyles">
                <div class='active-unit-title'>
                  <KRouterLink :text="activeUnit.title" :to="{}" />
                  <div class='unit-status'>
                    <span class='status-pill' :style="pillStyles">
                      <KIcon icon='info' :color="$themeTokens.textInverted" /> Active unit
                    </span>
                    <span v-if="lastCompletedTest && lastCompletedTest.test_type === 'pre'" class='status-message'>
                      <b> {{ preTestLabel$() }} </b>
                      <span style='text-transform: lowercase'>{{ completedLabel$() }}</span>
                    </span>
                    <span class='status-message'>
                      <b> {{ unitStatusMessages.boldMessage }} </b>
                      <span style='text-transform: lowercase'>{{ unitStatusMessages.plainMessage }}</span>
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
                  :title="upcomingUnitsLabel$()"
                  :headerAppearanceOverrides="upcomingUnitsAccordionHeaderStyles"
                  :contentAppearanceOverrides="{
                    padding: '0 0 48px 0',
                  }"
                >
                  <template #content>
                    <div
                      v-for="unit in upcomingUnits"
                      class='upcoming-unit'
                      :style="{ border: `1px solid ${$themeTokens.fineLine}` }"
                    >
                      <KRouterLink :text="unit.title" :to="{}" />
                      <span :style="{ color: $themeTokens.annotation }">
                        <KIcon icon="permission" :color="$themeTokens.annotation" />  {{ lockedLabel$() }}
                      </span>
                    </div>
                  </template>
                </AccordionItem>
              </AccordionContainer>
            </template>
            <template #[TABS.LEARNERS]>
              <h1> learners </h1>
            </template>
            <template #[TABS.OBJECTIVES]>
              <h1> objectives </h1>
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
        v-if="activeTest?.status == 'active'"
        class='post-modal-panel'
        :style="{ backgroundColor: $themePalette.grey.v_100 }"
      >
        <div class='panel-item'>
          <div class='panel-label'>
            {{ completedLabel$() }}
          </div>
          <div class='panel-message'>
            {{ nOfMLearners$({ n: 0, m: 10 }) }}
          </div>
        </div>
        <div class='panel-item'>
          <div class='panel-label'>
            {{ inProgressLabel$() }}
          </div>
          <div class='panel-message'>
            {{ "14 " + learnersLabel$() }}
          </div>
        </div>
      </div>
    </KModal>
  </CoachAppBarPage>

</template>


<script>

  import { computed, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
  import CoachHeader from '../common/CoachHeader.vue';
  import CoachAppBarPage from '../CoachAppBarPage.vue';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';

  export default {
    name: 'CourseSummaryPage',
    components: {
      AccordionContainer,
      AccordionItem,
      CoachAppBarPage,
      CoachHeader,
    },
    setup() {
      const {
        unitNLabel$,
        workingOnLessons$,
        startPreTest$,
        startPostTest$,

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
        postTestLabel$,
        lockedLabel$,
        unitsLabel$,
        learningObjectivesLabel$,
        readyToStartLabel$,
        upcomingUnitsLabel$,
        nOfMLearners$,
      } = coursesStrings;

      const {
        learnersLabel$,
        cancelAction$,
        completedLabel$,
        inProgressLabel$,
      } = coreStrings;

      const route = useRoute();
      const router = useRouter();

      const courseSession = ref(null);
      const course = ref(null);
      const activeTest = ref(null);
      const testHistory = ref([]);
      const lastCompletedTest = computed(() => {
        if(testHistory?.value?.length) {
          return testHistory.value[testHistory.value.length - 1];
        } else {
          return null;
        }
      })

      /**
        When `null` there is no active modal
        Otherwise, it should be set to an object that has the props
        that KModal expects:
          [submitText, submit, cancelText, cancel, title]

        `text` property will be put inside of the modal
        */
      const activeModal = ref(null);

      const _units = computed(() => course.value?.children?.results || []);
      const units = computed(() => _units.value.map((u,i) => {
        u.title = `${unitNLabel$({num: i + 1})} ${u.title}`;
        return u;
      }))
      const activeUnit = computed(() => {
        const unit = units.value.find(u => u.id === activeTest.value?.unit_contentnode_id);
        if(unit) {
          return unit
        } else {
          // Return the first unit if there are any units because we're at square one
          return units.value.length ? units.value[0] : null;
        }
      });
      const activeUnitIndex = computed(() => {
        return units.value.findIndex(u => u.id === activeUnit?.value?.id);
      });
      const completedUnits = computed(() => {
        if(activeUnitIndex.value > 0) {
          return units.value.slice(0, activeUnitIndex);
        } else {
          return [];
        }
      });
      const upcomingUnits = computed(() => {
        if(!activeUnit.value) {
          // If there is no active unit, then we're at square one
          return [];
        }
        return units.value.slice(activeUnitIndex.value + 1);
      });

      /**
        @deftype UnitStatusMessage
        @property boldMessage
        @property plainMessage
        */

      const unitStatusMessages = computed(() => {
        if(!activeTest.value) {
          if(lastCompletedTest.value) {
            if(lastCompletedTest.value.test_type === 'pre') {
              return {
                boldMessage: nOfMLearners$({ n: 0, m: 5}),
                plainMessage: workingOnLessons$(),
                buttonLabel: startPostTest$(),
              };
            }
          }
          return {
            boldMessage: preTestLabel$(),
            plainMessage: readyToStartLabel$(),
            buttonLabel: startPreTest$(),
          };
        }
        if(lastCompletedTest.value) {
          if(lastCompletedTest.value.test_type === 'pre') {
            return {
              boldMessage: nOfMLearners$({ n: 0, m: 5 }),
              plainMessage: completedLabel$(),
              buttonLabel: endPostTest$(),
            };
          } else {
            return {
              boldMessage: nOfMLearners$({ n: 0, m: 5 }),
              plainMessage: completedLabel$(),
              buttonLabel: endPreTest$(),
            };
          }
        }
      });


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


      const loading = ref(true);

      // Get the course session
      CourseSessionResource.fetchModel({ id: route.params.courseSessionId })
        .then(results => {
          courseSession.value = results;
          // Now get the course itself now that we have the course's ID
          return ContentNodeResource.fetchTree({ id: courseSession.value.course })
        })
        .then(results => {
          course.value = results;
        })
        .then(() => {
          Promise.all([
            CourseSessionResource.activeTest({ id: route.params.courseSessionId }),
            CourseSessionResource.testHistory({ id: route.params.courseSessionId }),
          ]).then(([active, history]) => {
            activeTest.value = active.active_test;
            testHistory.value = history.data;
          })
        })
        .finally(() => {
          loading.value = false;
        });

      function activateTest(unitId, testType) {
        activeModal.value = null;
        return CourseSessionResource.activateTest({
          id: route.params.courseSessionId,
          data: {
            unit_contentnode_id: unitId,
            test_type: testType,
          },
        }).then(results => {
          activeTest.value = results;
        })
      }


      function closeTest(unitId, testType) {
        activeModal.value = null;
        return CourseSessionResource.closeTest({
          id: route.params.courseSessionId,
          data: {
            unit_contentnode_id: unitId,
            test_type: testType,
          },
        }).then(results => {
          activeTest.value = results;
        })
      }

      const activeUnitStyles = computed(() => {
        if(!activeTest.value) {
          return {
            backgroundColor: themePalette().blue.v_100,
          };
        }
        return {
          backgroundColor: themePalette().yellow.v_100,
        };
      })

      const pillStyles = computed(() => {
        if(!activeTest.value) {
          return {
            backgroundColor: themePalette().blue.v_600,
            color: themeTokens().textInverted,
          }
        }
        return {
          backgroundColor: themePalette().orange.v_600,
          color: themeTokens().textInverted,
        }
      });

      const upcomingUnitsAccordionHeaderStyles = computed(() => {
        return {
          backgroundColor: themePalette().grey.v_100,
          padding: '0px 16px',
          fontWeight: 'bold',
        }
      });

      function onUnitButtonClick() {
        if(!activeTest.value) {
          // We have no activeTest, so we're definitely activating a test
          if(lastCompletedTest?.value?.test_type === "pre") {
            activeModal.value = {
              title: startPostTestForUnitConfirmation$({ num: activeUnitIndex.value + 1 }),
              text: startTestForUnitDescription$(),
              submitText: startPostTest$(),
              cancelText: cancelAction$(),
              submit: () => activateTest(activeUnit.value.id, 'post'),
              cancel: () => activeModal.value = null,
            }
          } else {
            activeModal.value = {
              title: startPreTestForUnitConfirmation$({ num: activeUnitIndex.value + 1 }),
              text: startTestForUnitDescription$(),
              submitText: startPreTest$(),
              cancelText: cancelAction$(),
              submit: () => activateTest(activeUnit.value.id, 'pre'),
              cancel: () => activeModal.value = null,
            }
          }
        } else {
          if(lastCompletedTest?.value?.test_type === "pre") {
            activeModal.value = {
              title: endPostTestForUnitConfirmation$({ num: activeUnitIndex.value + 1 }),
              text: endTestForUnitDescription$(),
              submitText: endPostTest$(),
              cancelText: cancelAction$(),
              submit: () => closeTest(activeUnit.value.id, 'post'),
              cancel: () => activeModal.value = null,
            }
          } else {
            activeModal.value = {
              title: endPreTestForUnitConfirmation$({ num: activeUnitIndex.value + 1 }),
              text: endTestForUnitDescription$(),
              submitText: endPreTest$(),
              cancelText: keepRunning$(),
              submit: () => closeTest(activeUnit.value.id, 'pre'),
              cancel: () => activeModal.value = null,
            }
          }
        }
      }

      return {
        loading,
        course,
        units,

        tabs,
        TABS,

        activeTabId,
        activateTest,
        activeTest,
        activeUnit,
        activeUnitIndex,
        activeModal,

        completedUnits,
        courseSession,
        upcomingUnits,
        activeUnitStyles,
        unitStatusMessages,
        upcomingUnitsAccordionHeaderStyles,
        upcomingUnitsLabel$,
        preTestLabel$,
        lockedLabel$,
        learnersLabel$,
        completedLabel$,
        inProgressLabel$,
        unitNLabel$,
        nOfMLearners$,
        startPreTestForUnitConfirmation$,
        lastCompletedTest,
        testHistory,

        pillStyles,
        onUnitButtonClick,
      };
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
  width: 190px;
  padding: 24px 16px 24px 24px;
}
.course-details {
  width: calc(100% - 190px);
}
.active-unit {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0px;

  a {
    font-weight: bold;
  }
}

.active-unit-title {
  display: flex;
  flex-grow: 2;
  gap: 8px;
  flex-direction: column;
  width: 75%;
}

.status-pill {
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
  justify-content: space-between;
  align-items: center;
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
    font-size: 12px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

}

</style>
