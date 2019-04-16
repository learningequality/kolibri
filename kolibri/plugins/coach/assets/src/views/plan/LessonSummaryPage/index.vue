<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <BackLinkWithOptions>
        <BackLink
          slot="backlink"
          :to="$router.getRoute('PLAN_LESSONS_ROOT', { classId: classId })"
          :text="backLinkString"
        />
        <LessonOptionsDropdownMenu
          slot="options"
          optionsFor="plan"
          @select="handleSelectOption"
        />
      </BackLinkWithOptions>

      <div class="lesson-summary">

        <AssignmentSummary
          :title="lessonTitle"
          :active="lessonActive"
          :description="lessonDescription"
          :recipients="lessonAssignments"
          :groups="learnerGroups"
        />

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
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import commonCoach from '../../common';
  import { selectionRootLink } from '../../../routes/planLessonsRouterUtils';
  import AssignmentSummary from '../../plan/assignments/AssignmentSummary';
  import ReportsLessonHeader from '../../reports/ReportsLessonHeader';
  import BackLinkWithOptions from '../../common/BackLinkWithOptions';
  import ManageLessonModals from './ManageLessonModals';
  import ResourceListTable from './ResourceListTable';
  import LessonOptionsDropdownMenu from './LessonOptionsDropdownMenu';

  const ReportsLessonHeaderStrings = crossComponentTranslator(ReportsLessonHeader);

  export default {
    name: 'LessonSummaryPage',
    metaInfo() {
      return {
        title: this.lessonTitle,
      };
    },
    components: {
      BackLinkWithOptions,
      ResourceListTable,
      ManageLessonModals,
      KRouterLink,
      AssignmentSummary,
      LessonOptionsDropdownMenu,
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
        learnerGroups: state => state.learnerGroups,
        workingResources: state => state.workingResources,
      }),
      lessonSelectionRootPage() {
        return selectionRootLink({ lessonId: this.lessonId, classId: this.classId });
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
      handleSelectOption(action) {
        if (action === 'EDIT_DETAILS') {
          this.$router.push(this.$router.getRoute('LessonEditDetailsPage'));
        } else {
          this.setLessonsModal(action);
        }
      },
    },
    $trs: {
      noResourcesInLesson: 'No resources in this lesson',
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
