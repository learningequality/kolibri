<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />
    <KGrid gutter="16">
      <KGridItem>
        <QuizLessonDetailsHeader
          examOrLesson="lesson"
          :backlinkLabel="coreString('allLessonsLabel')"
          :backlink="classRoute('ReportsLessonListPage')"
        >
          <LessonOptionsDropdownMenu
            slot="dropdown"
            optionsFor="report"
            @select="handleSelectOption"
          />
        </QuizLessonDetailsHeader>
      </KGridItem>
      <KGridItem :layout12="{ span: $isPrint ? 12 : 4 }">
        <LessonStatus
          activeKey="active"
          :className="className"
          :lesson="lesson"
          :groupNames="getRecipientNamesForExam(lesson)"
        />
      </KGridItem>
      <KGridItem :layout12="{ span: $isPrint ? 12 : 8 }">
        <KPageContainer :topMargin="$isPrint ? 0 : 24">
          <ReportsControls @export="exportCSV" />
          <HeaderTabs :enablePrint="true">
            <HeaderTab
              :text="coachString('reportLabel')"
              :to="classRoute('ReportsLessonReportPage', {})"
            />
            <HeaderTab
              :text="coreString('learnersLabel')"
              :to="classRoute('ReportsLessonLearnerListPage', {})"
            />
          </HeaderTabs>

          <h2 v-show="!$isPrint">
            {{ coachString('overallLabel') }}
          </h2>

          <CoreTable :emptyMessage="coachString('learnerListEmptyState')">
            <thead slot="thead">
              <tr>
                <th>{{ coachString('nameLabel') }}</th>
                <th>{{ coreString('progressLabel') }}</th>
                <th>{{ coachString('groupsLabel') }}</th>
              </tr>
            </thead>
            <transition-group slot="tbody" tag="tbody" name="list">
              <tr v-for="tableRow in table" :key="tableRow.id">
                <td>
                  <KLabeledIcon icon="person">
                    <KRouterLink
                      :text="tableRow.name"
                      :to="classRoute('ReportsLessonLearnerPage', { learnerId: tableRow.id })"
                    />
                  </KLabeledIcon>
                </td>
                <td>
                  <StatusSimple :status="tableRow.status" />
                </td>
                <td>
                  <TruncatedItemList :items="tableRow.groups" />
                </td>
              </tr>
            </transition-group>
          </CoreTable>
        </KPageContainer>
      </KGridItem>
    </KGrid>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import LessonOptionsDropdownMenu from '../plan/LessonSummaryPage/LessonOptionsDropdownMenu';
  import ReportsControls from './ReportsControls';

  export default {
    name: 'ReportsLessonLearnerListPage',
    components: {
      ReportsControls,
      LessonOptionsDropdownMenu,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      recipients() {
        return this.getLearnersForLesson(this.lesson);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = this._.sortBy(learners, ['name']);
        return sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            status: this.getLessonStatusStringForLearner(this.lesson.id, learner.id),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
    },
    methods: {
      handleSelectOption(action) {
        if (action === 'EDIT_DETAILS') {
          this.$router.push(this.$router.getRoute('LessonReportEditDetailsPage'));
        }
        if (action === 'MANAGE_RESOURCES') {
          this.$router.push(
            this.$router.getRoute(
              'SELECTION_ROOT',
              {},
              // So the "X" and "Cancel" buttons return back to the ReportPage
              { last: this.$route.name }
            )
          );
        }
        if (action === 'PRINT_REPORT') {
          this.$print();
        }
        if (action === 'EXPORT') {
          this.exportCSV();
        }
      },
      exportCSV() {
        const columns = [
          ...csvFields.name(),
          ...csvFields.learnerProgress(),
          ...csvFields.list('groups', 'groupsLabel'),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          lesson: this.lesson.title,
          learners: this.coachString('learnersLabel'),
        });
        exporter.export(this.table);
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';
  @import '../common/three-card-layout';

</style>
