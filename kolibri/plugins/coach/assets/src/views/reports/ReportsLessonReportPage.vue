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

      <ReportsLessonHeader />

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
                  'ReportsLessonExerciseLearnerListPage',
                  { exerciseId: tableRow.content_id }
                )"
              />
              <KRouterLink
                v-else
                :text="tableRow.title"
                :to="classRoute(
                  'ReportsLessonResourceLearnerListPage',
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
  import ReportsLessonHeader from './ReportsLessonHeader';

  export default {
    name: 'ReportsLessonReportPage',
    components: {
      ReportsLessonHeader,
    },
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
        return this.getLearnersForGroups(this.lesson.groups);
      },
      table() {
        const content = this.lesson.node_ids.map(node_id => this.contentNodeMap[node_id]);
        const sorted = this._.sortBy(content, ['title']);
        const mapped = sorted.map(content => {
          const tableRow = {
            avgTimeSpent: this.getContentAvgTimeSpent(content.content_id, this.recipients),
            tally: this.getLessonStatusTally(
              this.lesson.id,
              this.getLearnersForGroups(this.lesson.groups)
            ),
          };
          Object.assign(tableRow, content);
          return tableRow;
        });
        return mapped;
      },
    },
    $trs: {
      back: 'All lessons',
    },
  };

</script>


<style lang="scss" scoped></style>
