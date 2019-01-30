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

  import { mapState, mapGetters } from 'vuex';
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
      ...mapGetters('classSummary', [
        'getContentStatusForLearner',
        'getLearnersForGroups',
        'getContentAvgTimeSpent',
      ]),
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
            numCompleted: this.numCompleted(content.content_id),
            numNeedingHelp: this.numLearnersNeedingHelp(content),
            avgTimeSpent: this.getContentAvgTimeSpent(content.content_id, this.recipients),
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
          const status = this.getContentStatusForLearner(contentId, learnerId);
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
