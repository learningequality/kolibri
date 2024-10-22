<template>

  <CoachAppBarPage>
    <KGrid v-if="!loading">
      <KGridItem>
        <QuizLessonDetailsHeader
          examOrLesson="lesson"
          :backlinkLabel="coreString('allLessonsLabel')"
          :backlink="$router.getRoute('PLAN_LESSONS_ROOT', { classId: classId })"
        >
          <template #dropdown>
            <LessonOptionsDropdownMenu
              optionsFor="plan"
              @select="handleSelectOption"
            />
          </template>
        </QuizLessonDetailsHeader>
      </KGridItem>
      <KGridItem :layout12="{ span: $isPrint ? 12 : 4 }">
        <h2 class="visuallyhidden">
          {{ coachString('generalInformationLabel') }}
        </h2>
        <LessonStatus
          :className="className"
          :lesson="currentLesson"
          :groupNames="getRecipientNamesForLesson(currentLesson)"
        />
      </KGridItem>
      <KGridItem :layout12="{ span: $isPrint ? 12 : 8 }">
        <KPageContainer
          v-if="!loading"
          :topMargin="$isPrint ? 0 : 16"
        >
          <KRouterLink
            :to="lessonSelectionRootPage"
            :text="coachString('manageResourcesAction')"
            :primary="true"
            appearance="raised-button"
          />
          <ReportsControls @export="exportCSV" />
          <HeaderTabs :enablePrint="true">
            <KTabsList
              ref="tabList"
              :tabsId="REPORTS_LESSON_TABS_ID"
              :ariaLabel="coachString('detailsLabel')"
              :activeTabId="activeTabId"
              :tabs="tabs"
            />
          </HeaderTabs>
          <KTabsPanel
            :tabsId="REPORTS_LESSON_TABS_ID"
            :activeTabId="activeTabId"
          >
            <template #[ReportsLessonTabs.REPORTS]>
              <ReportsLessonResourcesTable
                ref="table"
                :title="currentLesson.title"
                :editable="!$isPrint"
                :entries="resourcesTable"
                @change="handleResourcesChange"
              />
            </template>
            <template #[ReportsLessonTabs.LEARNERS]>
              <ReportsLessonLearnersTable
                ref="table"
                :title="currentLesson.title"
                :entries="learnersTable"
              />
            </template>
          </KTabsPanel>
          <ManageLessonModals
            :currentAction="currentAction"
            @cancel="currentAction = ''"
          />
        </KPageContainer>
      </KGridItem>
    </KGrid>
  </CoachAppBarPage>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import { mapState, mapActions, mapMutations } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useSnackbar from 'kolibri.coreVue.composables.useSnackbar';
  import commonCoach from '../../common';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import ReportsControls from '../../reports/ReportsControls';
  import { selectionRootLink } from '../../../routes/planLessonsRouterUtils';
  import { LessonsPageNames } from '../../../constants/lessonsConstants';
  import { REPORTS_LESSON_TABS_ID, ReportsLessonTabs } from '../../../constants/tabsConstants';
  import ReportsLessonResourcesTable from '../../reports/ReportsLessonResourcesTable';
  import ReportsLessonLearnersTable from '../../reports/ReportsLessonLearnersTable';
  import LessonOptionsDropdownMenu from './LessonOptionsDropdownMenu';
  import ManageLessonModals from './ManageLessonModals';

  const REMOVAL_SNACKBAR_TIME = 5000;

  export default {
    name: 'LessonSummaryPage',
    metaInfo() {
      return {
        title: this.currentLesson.title,
      };
    },
    components: {
      ReportsControls,
      CoachAppBarPage,
      ManageLessonModals,
      LessonOptionsDropdownMenu,
      ReportsLessonLearnersTable,
      ReportsLessonResourcesTable,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { createSnackbar, clearSnackbar } = useSnackbar();
      return { createSnackbar, clearSnackbar };
    },
    data() {
      const workingResourcesBackup = [...this.$store.state.lessonSummary.workingResources];

      return {
        currentAction: '',
        ReportsLessonTabs,
        workingResourcesBackup,
        REPORTS_LESSON_TABS_ID,
      };
    },
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('lessonSummary', ['currentLesson', 'workingResources', 'resourceCache']),
      classId() {
        return this.currentLesson.classroom.id;
      },
      loading() {
        return this.$store.state.core.loading;
      },
      lessonId() {
        return this.$route.params.lessonId;
      },
      lessonSelectionRootPage() {
        return selectionRootLink({ lessonId: this.lessonId, classId: this.classId });
      },
      activeTabId() {
        const { tabId } = this.$route.params;
        if (Object.values(ReportsLessonTabs).includes(tabId)) {
          return tabId;
        }
        return ReportsLessonTabs.REPORTS;
      },
      tabs() {
        const tabsList = [
          {
            id: ReportsLessonTabs.REPORTS,
            label: this.coreString('resourcesLabel'),
          },
          {
            id: ReportsLessonTabs.LEARNERS,
            label: this.coachString('learnersLabel'),
          },
        ];

        tabsList.forEach(tab => {
          tab.to = this.classRoute(LessonsPageNames.SUMMARY, { tabId: tab.id });
        });

        return tabsList;
      },
      recipients() {
        return this.getLearnersForLesson(this.currentLesson);
      },
      resourcesTable() {
        return this.workingResources.map(resource => {
          const content = this.resourceCache[resource.contentnode_id];
          if (!content) {
            return this.missingResourceObj(resource.contentnode_id);
          }

          const tally = this.getContentStatusTally(content.content_id, this.recipients);
          const tableRow = {
            ...content,
            node_id: content.id,
            avgTimeSpent: this.getContentAvgTimeSpent(content.content_id, this.recipients),
            tally,
            hasAssignments: Object.values(tally).reduce((a, b) => a + b, 0),
          };

          const link = this.resourceLink(tableRow);
          if (link) {
            tableRow.link = link;
          }

          return tableRow;
        });
      },
      learnersTable() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = sortBy(learners, ['name']);

        const table = sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            status: this.getLessonStatusStringForLearner(this.lessonId, learner.id),
            link: this.classRoute('ReportsLessonLearnerPage', { learnerId: learner.id }),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
        return table;
      },
      numberOfRemovals() {
        return this.workingResourcesBackup.length - this.workingResources.length;
      },
    },
    watch: {
      loading(newVal, oldVal) {
        if (!newVal && oldVal) {
          this.workingResourcesBackup = [...this.$store.state.lessonSummary.workingResources];
        }
      },
    },
    methods: {
      ...mapActions('lessonSummary', [
        'saveLessonResources',
        'updateCurrentLesson',
        'fetchLessonsSizes',
      ]),
      ...mapMutations('lessonSummary', {
        setWorkingResources: 'SET_WORKING_RESOURCES',
      }),
      handleSelectOption(action) {
        if (action === 'EDIT_DETAILS') {
          this.$router.push(this.$router.getRoute('LessonEditDetailsPage'));
        } else {
          this.currentAction = action;
        }
      },
      exportCSV() {
        if (typeof this.$refs.table.exportCSV === 'function') {
          this.$refs.table.exportCSV();
        }
      },
      resourceLink(resource) {
        if (resource.hasAssignments) {
          if (resource.kind === this.ContentNodeKinds.EXERCISE) {
            return this.classRoute(
              this.group
                ? 'ReportsGroupReportLessonExerciseLearnerListPage'
                : 'ReportsLessonExerciseLearnerListPage',
              { exerciseId: resource.content_id },
            );
          } else {
            return this.classRoute(
              this.group
                ? 'ReportsGroupReportLessonResourceLearnerListPage'
                : 'ReportsLessonResourceLearnerListPage',
              { resourceId: resource.content_id },
            );
          }
        }
      },
      showResourcesRemovedNotification() {
        const undo = () => {
          this.save(this.workingResourcesBackup);
          this.clearSnackbar();
        };
        const hide = () => {
          if (this.workingResourcesBackup) {
            // snackbar might carryover to another page (like select)
            this.workingResourcesBackup = [...this.workingResources];
          }
        };
        this.showSnackbarNotification(
          'resourcesRemovedWithCount',
          { count: this.numberOfRemovals },
          {
            autoDismiss: true,
            duration: REMOVAL_SNACKBAR_TIME,
            actionText: this.$tr('undoActionPrompt'),
            actionCallback: undo,
            hideCallback: hide,
          },
        );
      },
      async handleResourcesChange({ newArray }) {
        const newResources = newArray.map(row => {
          return this.workingResources.find(resource => resource.contentnode_id === row.node_id);
        });
        await this.save(newResources);
        await this.$nextTick();
        if (this.numberOfRemovals > 0) {
          this.showResourcesRemovedNotification();
        } else {
          this.showSnackbarNotification('resourceOrderSaved');
        }
      },
      async save(resources) {
        this.setWorkingResources(resources);
        try {
          await this.saveLessonResources({
            lessonId: this.lessonId,
            resources,
          });
        } catch {
          this.setWorkingResources(this.workingResourcesBackup);
          this.createSnackbar(this.coachString('saveLessonError'));
        }
        await this.updateCurrentLesson(this.lessonId);
        await this.fetchLessonsSizes({ classId: this.classId });
      },
    },
    $trs: {
      undoActionPrompt: {
        message: 'Undo',
        context: 'Allows user to undo an action.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .resource-list-header {
    // TODO use shared class or mixin
    // maintaining a simple right/left alignment in a single text-line without floats. Simple RTL
    display: table;
    width: 100%;
  }

  .resource-list-header-title {
    display: inline-block;
    font-size: 1em;
  }

  .resource-list-header-title-block {
    display: table-cell;
    text-align: left;
  }

  .resource-list-header-add-resource-button {
    display: table-cell;
    text-align: right;
  }

  .no-resources-message {
    padding: 48px 0;
    text-align: center;
  }

</style>
