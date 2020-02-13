<template>

  <div>
    <p>
      <BackLink
        :to="classRoute('ReportsLearnerListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>
      <KLabeledIcon icon="person" :label="learner.name" />
    </h1>
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">
          {{ coreString('usernameLabel') }}
        </template>
        <template slot="value">
          {{ learner.username }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">
          {{ coachString('groupsLabel') }}
        </template>
        <TruncatedItemList slot="value" :items="getGroupNamesForLearner(learner.id)" />
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">
          {{ coachString('avgQuizScoreLabel') }}
        </template>
        <template slot="value">
          {{ coachString('percentage', {value: avgScore}) }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">
          {{ coachString('exercisesCompletedLabel') }}
        </template>
        <template slot="value">
          {{ coachString('integer', {value: exercisesCompleted}) }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">
          {{ coachString('resourcesViewedLabel') }}
        </template>
        <template slot="value">
          {{ coachString('integer', {value: resourcesViewed}) }}
        </template>
      </HeaderTableRow>
    </HeaderTable>
    <HeaderTabs :enablePrint="enablePrint">
      <HeaderTab
        :text="coachString('reportsLabel')"
        :to="classRoute('ReportsLearnerReportPage', {})"
      />
      <HeaderTab
        :text="coachString('activityLabel')"
        :to="classRoute('ReportsLearnerActivityPage', {})"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';

  export default {
    name: 'ReportsLearnerHeader',
    components: {},
    mixins: [commonCoach, commonCoreStrings],
    props: {
      enablePrint: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
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
            this.contentIdIsForExercise(status.content_id) &&
            status.status === this.STATUSES.completed
        );
        return statuses.length;
      },
      resourcesViewed() {
        const statuses = this.learnerContentStatuses.filter(
          status =>
            !this.contentIdIsForExercise(status.content_id) &&
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
