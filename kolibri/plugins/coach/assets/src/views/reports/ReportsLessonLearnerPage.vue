<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <p>
        <BackLink
          :to="classRoute('ReportsLessonLearnerListPage')"
          :text="lesson.title"
        />
      </p>
      <h1>{{ learner.name }}</h1>

      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('titleLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
            <td>{{ coachStrings.$tr('timeSpentLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.node_id">
            <td>
              <KRouterLink
                v-if="tableRow.kind === 'exercise'"
                :text="tableRow.title"
                :to="exerciseLink(tableRow.content_id)"
              />
              <template v-else>{{ tableRow.title }}</template>
            </td>
            <td>
              <StatusSimple :status="tableRow.status" />
            </td>
            <td><TimeDuration :seconds="tableRow.timeSpent" /></td>
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import get from 'lodash/get';
  import commonCoach from '../common';

  export default {
    name: 'ReportsLessonLearnerPage',
    components: {},
    mixins: [commonCoach],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      table() {
        const contentArray = this.lesson.node_ids.map(node_id => this.contentNodeMap[node_id]);
        const sorted = this._.sortBy(contentArray, ['title']);
        const mapped = sorted.map(content => {
          const tableRow = {
            status: this.getContentStatusForLearner(content.content_id, this.learner.id),
            timeSpent: get(
              this.contentLearnerStatusMap,
              [content.content_id, this.learner.id, 'time_spent'],
              undefined
            ),
          };
          Object.assign(tableRow, content);
          return tableRow;
        });
        return mapped;
      },
    },
    methods: {
      exerciseLink(exerciseId) {
        return this.classRoute('ReportsLessonLearnerExercisePage', { exerciseId });
      },
    },
    $trs: {
      lessonProgressLabel: "'{lesson}' progress",
    },
  };

</script>


<style lang="scss" scoped></style>
