<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <p>
        <BackLink
          :to="$router.getRoute('PLAN_LESSONS_ROOT', { classId: classId })"
          :text="backLinkString"
        />

      </p>
      <div class="lesson-summary">

        <AssignmentSummary
          :kind="lessonKind"
          :title="lessonTitle"
          :active="lessonActive"
          :description="lessonDescription"
          :recipients="lessonAssignments"
          :groups="learnerGroups"
          @changeStatus="setLessonsModal(AssignmentActions.CHANGE_STATUS)"
        >
          <KDropdownMenu
            slot="optionsDropdown"
            :text="$tr('options')"
            :options="lessonOptions"
            @select="handleSelectOption"
          />
        </AssignmentSummary>

        <div>
          <div class="resource-list">
            <div class="resource-list-header">
              <div class="resource-list-header-title-block">
                <h2 class="resource-list-header-title">
                  {{ $tr('resources') }}
                </h2>
              </div>
              <div class="resource-list-header-add-resource-button">
                <KRouterLink
                  :to="lessonSelectionRootPage"
                  :text="$tr('manageResourcesButton')"
                  :primary="true"
                  appearance="raised-button"
                />
              </div>
            </div>
          </div>

          <ResourceListTable v-if="workingResources.length" />

          <p v-else class="no-resources-message">
            {{ $tr('noResourcesInLesson') }}
          </p>

          <ManageLessonModals />
        </div>

      </div>

    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import map from 'lodash/map';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import commonCoach from '../../common';
  import { AssignmentActions } from '../../../constants/assignmentsConstants';
  import { selectionRootLink } from '../../../routes/planLessonsRouterUtils';
  import AssignmentSummary from '../../plan/assignments/AssignmentSummary';
  import ReportsLessonHeader from '../../reports/ReportsLessonHeader';
  import ManageLessonModals from './ManageLessonModals';
  import ResourceListTable from './ResourceListTable';

  const ReportsLessonHeaderStrings = crossComponentTranslator(ReportsLessonHeader);

  export default {
    name: 'LessonSummaryPage',
    metaInfo() {
      return {
        title: this.lessonTitle,
      };
    },
    components: {
      KDropdownMenu,
      ResourceListTable,
      ManageLessonModals,
      KRouterLink,
      AssignmentSummary,
    },
    mixins: [commonCoach],
    computed: {
      backLinkString() {
        return ReportsLessonHeaderStrings.$tr('back');
      },
      ...mapState(['reportRefreshInterval']),
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('lessonSummary', {
        // IDEA refactor, make actions get all this information themselves.
        lessonId: state => state.currentLesson.id,
        lessonTitle: state => state.currentLesson.title,
        lessonActive: state => state.currentLesson.is_active,
        lessonDescription: state => state.currentLesson.description,
        lessonAssignments: state => state.currentLesson.lesson_assignments,
        lessonResources: state => state.currentLesson.resources,
        learnerGroups: state => state.learnerGroups,
        workingResources: state => state.workingResources,
      }),
      lessonOptions() {
        return map(this.actionsToLabelMap, (label, action) => ({
          label: this.$tr(label),
          action,
        }));
      },
      actionsToLabelMap() {
        return {
          [AssignmentActions.EDIT_DETAILS]: 'editLessonDetails',
          [AssignmentActions.COPY]: 'copyLesson',
          [AssignmentActions.DELETE]: 'deleteLesson',
        };
      },
      AssignmentActions() {
        return AssignmentActions;
      },
      lessonSelectionRootPage() {
        return selectionRootLink({ lessonId: this.lessonId, classId: this.classId });
      },
      lessonKind() {
        return ContentNodeKinds.LESSON;
      },
    },
    mounted() {
      this.intervalId = setInterval(this.refreshReportData, this.reportRefreshInterval);
    },
    beforeDestroy() {
      this.intervalId = clearInterval(this.intervalId);
    },
    methods: {
      ...mapActions('lessonSummary', ['setLessonsModal', 'setLessonReportTableData']),
      // Data to do a proper refresh. See showLessonSummaryPage for details.
      refreshReportData() {
        return this.setLessonReportTableData({
          lessonId: this.lessonId,
          isSamePage: samePageCheckGenerator(this.$store),
        });
      },
      handleSelectOption({ action }) {
        this.setLessonsModal(action);
      },
    },
    $trs: {
      // TODO make labels more semantic
      copyLesson: 'Copy lesson',
      deleteLesson: 'Delete',
      editLessonDetails: 'Edit details',
      noResourcesInLesson: 'No resources in this lesson',
      options: 'Options',
      resources: 'Resources',
      manageResourcesButton: 'Manage resources',
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
