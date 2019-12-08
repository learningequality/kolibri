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
          :to="classRoute('ReportsGroupReportPage')"
          :text="group.name"
        />
      </p>
      <h1>
        <KLabeledIcon icon="lesson" :label="lesson.title" />
      </h1>
      <p v-show="!$isPrint">
        {{ $tr('lessonProgressLabel', {lesson: lesson.title}) }}
      </p>
      <HeaderTable>
        <HeaderTableRow v-if="$isPrint" :keyText="coachString('groupNameLabel')">
          <template slot="value">
            {{ group.name }}
          </template>
        </HeaderTableRow>
        <HeaderTableRow v-show="!$isPrint" :keyText="coachString('statusLabel')">
          <LessonActive slot="value" :active="lesson.active" />
        </HeaderTableRow>
        <HeaderTableRow
          v-show="!$isPrint"
          :keyText="coachString('descriptionLabel')"
          :valueText="lesson.description || coachString('descriptionMissingLabel')"
        />
      </HeaderTable>

      <ReportsControls @export="exportCSV" />

      <CoreTable :emptyMessage="coachString('lessonListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('titleLabel') }}</th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ coachString('avgTimeSpentLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.node_id">
            <td>
              <KLabeledIcon :icon="tableRow.kind">
                <KRouterLink
                  v-if="tableRow.kind === 'exercise'"
                  :text="tableRow.title"
                  :to="classRoute(
                    'ReportsGroupReportLessonExerciseLearnerListPage',
                    { exerciseId: tableRow.content_id }
                  )"
                />
                <KRouterLink
                  v-else
                  :text="tableRow.title"
                  :to="classRoute(
                    'ReportsGroupReportLessonResourceLearnerListPage',
                    { resourceId: tableRow.content_id }
                  )"
                />
              </KLabeledIcon>
            </td>
            <td>
              <StatusSummary
                :tally="tableRow.tally"
                :verbose="true"
              />
            </td>
            <td>
              <TimeDuration :seconds="tableRow.avgTimeSpent" />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsControls from './ReportsControls';

  export default {
    name: 'ReportsGroupReportLessonPage',
    components: {
      ReportsControls,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      group() {
        return this.groupMap[this.$route.params.groupId];
      },
      recipients() {
        return this.getLearnersForGroups([this.$route.params.groupId]);
      },
      table() {
        const contentArray = this.lesson.node_ids.map(node_id => this.contentNodeMap[node_id]);
        return contentArray.map(content => {
          const tableRow = {
            avgTimeSpent: this.getContentAvgTimeSpent(content.content_id, this.recipients),
            tally: this.getContentStatusTally(content.content_id, this.recipients),
          };
          Object.assign(tableRow, content);
          return tableRow;
        });
      },
    },
    methods: {
      exportCSV() {
        const columns = [
          ...csvFields.title(),
          ...csvFields.tally(),
          ...csvFields.timeSpent('avgTimeSpent', 'avgTimeSpentLabel'),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          lesson: this.lesson.title,
          group: this.group.name,
        });

        exporter.export(this.table);
      },
    },
    $trs: {
      lessonProgressLabel: "'{lesson}' progress",
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

</style>
