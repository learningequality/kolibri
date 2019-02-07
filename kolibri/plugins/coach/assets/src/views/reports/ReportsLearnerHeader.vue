<template>

  <div>
    <p>
      <BackLink
        :to="classRoute('ReportsLearnerListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>
      <KLabeledIcon>
        <KIcon slot="icon" person />
        {{ learner.name }}
      </KLabeledIcon>
    </h1>
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('usernameLabel') }}</template>
        <template slot="value">{{ learner.username }}</template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('groupsLabel') }}</template>
        <TruncatedItemList slot="value" :items="getGroupNamesForLearner(learner.id)" />
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('avgQuizScoreLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('percentage', {value: avgScore}) }}</template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('exercisesCompletedLabel') }}</template>
        <template slot="value">
          {{ coachStrings.$tr('integer', {value: exercisesCompleted}) }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('resourcesViewedLabel') }}</template>
        <template slot="value">
          {{ coachStrings.$tr('integer', {value: resourcesViewed}) }}
        </template>
      </HeaderTableRow>
    </HeaderTable>
    <HeaderTabs>
      <HeaderTab
        :text="coachStrings.$tr('reportsLabel')"
        :to="classRoute('ReportsLearnerReportPage', {})"
      />
      <HeaderTab
        :text="coachStrings.$tr('activityLabel')"
        :to="classRoute('ReportsLearnerActivityPage', {})"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsLearnerHeader',
    components: {},
    mixins: [commonCoach],
    computed: {
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      learnerContentStatuses() {
        return this.contentStatuses.filter(status => this.learner.id === status.learner_id);
      },
      avgScore() {
        const statuses = this.examStatuses.filter(
          status =>
            this.learner.id === status.learner_id && status.status === this.STATUSES.completed
        );
        if (!statuses.length) {
          return null;
        }
        return this._.meanBy(statuses, 'score');
      },
      exercisesCompleted() {
        const statuses = this.learnerContentStatuses.filter(
          status =>
            this.contentMap[status.content_id].kind === 'exercise' &&
            status.status === this.STATUSES.completed
        );
        return statuses.length;
      },
      resourcesViewed() {
        const statuses = this.learnerContentStatuses.filter(
          status =>
            this.contentMap[status.content_id].kind !== 'exercise' &&
            status.status !== this.STATUSES.notStarted
        );
        return statuses.length;
      },
    },
    $trs: {
      back: 'All learners',
    },
  };

</script>


<style lang="scss" scoped></style>
