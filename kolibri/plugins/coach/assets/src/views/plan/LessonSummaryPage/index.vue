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

        <div>
          <h1 dir="auto">
            <KLabeledIcon>
              <KIcon slot="icon" lesson />
              {{ currentLesson.title }}
            </KLabeledIcon>
          </h1>

          <HeaderTable>
            <HeaderTableRow :keyText="coachStrings.$tr('statusLabel')">
              <LessonActive slot="value" :active="currentLesson.is_active" />
            </HeaderTableRow>
            <HeaderTableRow :keyText="coachStrings.$tr('recipientsLabel')">
              <template slot="value">
                <template v-if="!currentLesson.lesson_assignments.length">
                  {{ this.$tr('noOne') }}
                </template>
                <Recipients v-else :groupNames="groupNames" />
              </template>
            </HeaderTableRow>
            <HeaderTableRow
              :keyText="coachStrings.$tr('descriptionLabel')"
              :valueText="currentLesson.description || $tr('noDescription')"
            />
          </HeaderTable>
        </div>

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
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import commonCoach from '../../common';
  import { selectionRootLink } from '../../../routes/planLessonsRouterUtils';
  import HeaderTable from '../../common/HeaderTable';
  import HeaderTableRow from '../../common/HeaderTable/HeaderTableRow';
  import Recipients from '../../common/Recipients';
  import LessonActive from '../../common/LessonActive';
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
        title: this.currentLesson.title,
      };
    },
    components: {
      KIcon,
      KLabeledIcon,
      HeaderTable,
      HeaderTableRow,
      Recipients,
      LessonActive,
      BackLinkWithOptions,
      ResourceListTable,
      ManageLessonModals,
      KRouterLink,
      LessonOptionsDropdownMenu,
    },
    mixins: [commonCoach],
    computed: {
      backLinkString() {
        return ReportsLessonHeaderStrings.$tr('back');
      },
      ...mapState(['reportRefreshInterval']),
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('lessonSummary', ['currentLesson', 'workingResources']),
      lessonId() {
        return this.$route.params.lessonId;
      },
      lessonSelectionRootPage() {
        return selectionRootLink({ lessonId: this.lessonId, classId: this.classId });
      },
      groupNames() {
        const names = [];
        this.recipients.forEach(r => {
          const match = this.groups.find(({ id }) => id === r.collection);
          if (match) {
            names.push(match.name);
          }
        });
        return names;
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
      noDescription: 'No description',
      noOne: 'No one',
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
