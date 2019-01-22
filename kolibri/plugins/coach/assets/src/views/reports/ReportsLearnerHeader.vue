<template>

  <div>
    <p>
      <BackLink
        :to="newCoachRoute('ReportsLearnerListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>Julie</h1>
    <dl>
      <dt>{{ coachStrings.$tr('usernameLabel') }}</dt>
      <dd>julie124</dd>
      <dt>{{ coachStrings.$tr('groupsLabel') }}</dt>
      <dd><TruncatedItemList :items="['a', 'b', 'c', 'd']" /></dd>
      <dt>{{ coachStrings.$tr('exercisesCompletedLabel') }}</dt>
      <dd>{{ coachStrings.$tr('integer', {value: 4}) }}</dd>
      <dt>{{ coachStrings.$tr('avgQuizScoreLabel') }}</dt>
      <dd>{{ coachStrings.$tr('percentage', {value: 0.4}) }}</dd>
      <dt>{{ coachStrings.$tr('quizzesCompletedLabel') }}</dt>
      <dd>{{ coachStrings.$tr('ratio', {value: 4, total: 6}) }}</dd>
      <dt>{{ coachStrings.$tr('lessonsAssignedLabel') }}</dt>
      <dd>{{ coachStrings.$tr('integer', {value: 10}) }}</dd>
      <dt>{{ coachStrings.$tr('resourcesViewedLabel') }}</dt>
      <dd>{{ coachStrings.$tr('integer', {value: 45}) }}</dd>
      <dt>{{ coachStrings.$tr('lessonsCompletedLabel') }}</dt>
      <dd>{{ coachStrings.$tr('ratio', {value: 4, total: 6}) }}</dd>
    </dl>
    <div>
      <KRouterLink
        :text="coachStrings.$tr('reportsLabel')"
        :to="newCoachRoute('ReportsLearnerReportPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('activityLabel')"
        :to="newCoachRoute('ReportsLearnerActivityPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
    </div>
    <hr>
  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsLearnerHeader',
    components: {},
    mixins: [commonCoach],
    $trs: {
      back: 'All learners',
    },
  };

</script>


<style lang="scss" scoped></style>
