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
            <!-- TODO COACH
            <td>{{ coachStrings.$tr('avgTimeSpentLabel') }}</td>
             -->
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
              <LearnerProgressRatio
                :count="tableRow.numCompleted"
                :total="recipients.length"
                verbosity="1"
                verb="completed"
                icon="learners"
              />
              <LearnerProgressCount
                v-if="tableRow.numNeedingHelp"
                verb="needHelp"
                icon="help"
                :count="tableRow.numNeedingHelp"
                :verbosity="0"
              />
            </td>
            <!-- TODO COACH
            <td><TimeDuration :seconds="360" /></td>
             -->
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from '../common';
  import ReportsLessonHeader from './ReportsLessonHeader';

  export default {
    name: 'ReportsLessonReportPage',
    components: {
      ReportsLessonHeader,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('classSummary', ['lessonMap', 'contentNodeMap', 'contentLearnerStatusMap']),
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
        return this.dataHelpers.learnersForGroups(this.lesson.groups);
      },
      table() {
        const content = this.lesson.node_ids.map(node_id => this.contentNodeMap[node_id]);
        const sorted = this.dataHelpers.sortBy(content, ['title']);
        const mapped = sorted.map(content => {
          const tableRow = {
            numCompleted: this.numCompleted(content.content_id),
            numNeedingHelp: this.numLearnersNeedingHelp(content.content_id),
            avgTimeSpent: undefined,
          };
          Object.assign(tableRow, content);
          return tableRow;
        });
        return mapped;
      },
    },
    methods: {
      numCompleted(contentId) {
        return this.recipients.reduce((acc, learnerId) => {
          const status = this.dataHelpers.contentStatusForLearner(contentId, learnerId);
          if (status === this.STATUSES.completed) {
            return acc + 1;
          }
          return acc;
        }, 0);
      },
      numLearnersNeedingHelp(content) {
        // TODO COACH
        if (content.kind === 'exercise') {
          return 0;
        }
        return 0;
      },
    },
    $trs: {
      back: 'All lessons',
    },
  };

</script>


<style lang="scss" scoped></style>
