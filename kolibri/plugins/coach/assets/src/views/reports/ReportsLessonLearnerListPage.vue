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

      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>

      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('titleLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
            <td>{{ coachStrings.$tr('groupsLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KRouterLink
                :text="tableRow.name"
                :to="classRoute('ReportsLessonLearnerPage', { learnerId: tableRow.id })"
              />
            </td>
            <td>
              <ItemStatusRatio
                :count="tableRow.numCompleted"
                :total="lesson.node_ids.length"
                verbosity="2"
                :obj="OBJECTS.resource"
                :adjective="ADJECTIVES.completed"
                :icon="ICONS.clock"
              />
            </td>
            <td>
              <TruncatedItemList :items="tableRow.groups" />
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
    name: 'ReportsLessonLearnerListPage',
    components: {
      ReportsLessonHeader,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('classSummary', [
        'lessonMap',
        'learnerMap',
        'contentNodeMap',
        'contentLearnerStatusMap',
      ]),
      ...mapGetters('classSummary', [
        'groups',
        'getLearnersForGroups',
        'getContentStatusForLearner',
        'getGroupNamesForLearner',
      ]),
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      recipients() {
        return this.getLearnersForGroups(this.lesson.groups);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = this._.sortBy(learners, ['name']);
        const mapped = sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            numCompleted: this.numCompleted(learner.id),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
        return mapped;
      },
    },
    methods: {
      numCompleted(learnerId) {
        const contentIds = this.lesson.node_ids.map(
          node_id => this.contentNodeMap[node_id].content_id
        );
        return contentIds.reduce((acc, contentId) => {
          const status = this.getContentStatusForLearner(contentId, learnerId);
          if (status === this.STATUSES.completed) {
            return acc + 1;
          }
          return acc;
        }, 0);
      },
    },
    $trs: {
      averageScore: 'Average score: {score, number, percent}',
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped></style>
