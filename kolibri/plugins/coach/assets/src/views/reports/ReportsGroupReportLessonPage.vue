<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <p>
        <BackLink
          :to="classRoute('ReportsGroupReportPage', {})"
          text="Group A"
        />
      </p>
      <h1>Group A</h1>
      <p>{{ $tr('lessonProgressLabel', {lesson: lesson.title}) }}</p>
      <HeaderTable>
        <HeaderTableRow>
          <template slot="key">{{ coachStrings.$tr('statusLabel') }}</template>
          <template slot="value"><LessonActive :active="true" /></template>
        </HeaderTableRow>
        <!-- TODO COACH
        <HeaderTableRow>
          <template slot="key">{{ coachStrings.$tr('descriptionLabel') }}</template>
          <template slot="value">Ipsum lorem</template>
        </HeaderTableRow>
         -->
      </HeaderTable>

      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('titleLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
            <td>{{ coachStrings.$tr('avgTimeSpentLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.node_id">
            <td>
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
    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsGroupReportLessonPage',
    components: {},
    mixins: [commonCoach],
    computed: {
      actionOptions() {
        return [
          { label: this.coachStrings.$tr('editDetailsAction'), value: 'ReportsLessonEditorPage' },
          {
            label: this.coachStrings.$tr('manageResourcesAction'),
            value: 'ReportsLessonManagerPage',
          },
        ];
      },
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      recipients() {
        return this.getLearnersForGroups([this.$route.params.groupId]);
      },
      table() {
        const contentArray = this.lesson.node_ids.map(node_id => this.contentNodeMap[node_id]);
        const sorted = this._.sortBy(contentArray, ['title']);
        const mapped = sorted.map(content => {
          const tableRow = {
            avgTimeSpent: this.getContentAvgTimeSpent(content.content_id, this.recipients),
            tally: this.getContentStatusTally(content.content_id, this.recipients),
          };
          Object.assign(tableRow, content);
          return tableRow;
        });
        return mapped;
      },
    },
    $trs: {
      lessonProgressLabel: "'{lesson}' progress",
    },
  };

</script>


<style lang="scss" scoped></style>
