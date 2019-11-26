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
          :to="classRoute('ReportsGroupReportLessonPage', {})"
          :text="coachString('backToLessonLabel', { lesson: lesson.title })"
        />
      </p>
      <h1>
        <KLabeledIcon :icon="resource.kind" :label="resource.title" />
      </h1>

      <HeaderTable>
        <HeaderTableRow v-if="$isPrint">
          <template slot="key">
            {{ coachString('groupNameLabel') }}
          </template>
          <template slot="value">
            {{ group.name }}
          </template>
        </HeaderTableRow>
        <HeaderTableRow v-if="$isPrint">
          <template slot="key">
            {{ coachString('lessonLabel') }}
          </template>
          <template slot="value">
            {{ lesson.title }}
          </template>
        </HeaderTableRow>
        <HeaderTableRow>
          <template slot="key">
            {{ coachString('avgTimeSpentLabel') }}
          </template>
          <template slot="value">
            <TimeDuration :seconds="360" />
          </template>
        </HeaderTableRow>
      </HeaderTable>

      <ReportsControls @export="exportCSV">
        <p>
          <StatusSummary :tally="tally" />
        </p>
      </ReportsControls>

      <CoreTable :emptyMessage="coachString('activityListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('nameLabel') }}</th>
            <th>{{ coachString('statusLabel') }}</th>
            <th>{{ coachString('timeSpentLabel') }}</th>
            <th>{{ coachString('groupsLabel') }}</th>
            <th>{{ coachString('lastActivityLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon icon="person" :label="tableRow.name" />
            </td>
            <td>
              <StatusSimple :status="tableRow.statusObj.status" />
            </td>
            <td>
              <TimeDuration :seconds="tableRow.statusObj.time_spent" />
            </td>
            <td>
              <TruncatedItemList :items="tableRow.groups" />
            </td>
            <td>
              <ElapsedTime :date="tableRow.statusObj.last_activity" />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsControls from './ReportsControls';

  export default {
    name: 'ReportsGroupReportLessonResourceLearnerListPage',
    components: {
      ReportsControls,
    },
    mixins: [commonCoach],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      resource() {
        return this.contentMap[this.$route.params.resourceId];
      },
      group() {
        return this.groupMap[this.$route.params.groupId];
      },
      recipients() {
        return this.getLearnersForGroups([this.$route.params.groupId]);
      },
      tally() {
        return this.getContentStatusTally(this.$route.params.resourceId, this.recipients);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = this._.sortBy(learners, ['name']);
        return sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            statusObj: this.getContentStatusObjForLearner(
              this.$route.params.resourceId,
              learner.id
            ),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
    },
    methods: {
      exportCSV() {
        const columns = [
          ...csvFields.name(),
          ...csvFields.learnerProgress('statusObj.status'),
          ...csvFields.timeSpent('statusObj.time_spent'),
          ...csvFields.list('groups', 'groupsLabel'),
          ...csvFields.lastActivity(),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          group: this.group.name,
          lesson: this.lesson.title,
          resource: this.resource.title,
        });

        exporter.export(this.table);
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .stats {
    margin-right: 16px;
  }

</style>
