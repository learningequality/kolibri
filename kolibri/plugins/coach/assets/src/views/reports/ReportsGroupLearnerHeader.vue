<template>

  <div>
    <p>
      <BackLink
        :to="classRoute('ReportsGroupLearnerListPage', {})"
        :text="$tr('back')"
      />
    </p>
    <h1>Julie</h1>
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('usernameLabel') }}</template>
        <template slot="value">julie124</template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('exercisesCompletedLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('integer', {value: 4}) }}</template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('avgQuizScoreLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('percentage', {value: 0.4}) }}</template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('quizzesCompletedLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('ratio', {value: 4, total: 6}) }}</template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('lessonsAssignedLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('integer', {value: 10}) }}</template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('resourcesViewedLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('integer', {value: 45}) }}</template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('lessonsCompletedLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('ratio', {value: 4, total: 6}) }}</template>
      </HeaderTableRow>
    </HeaderTable>
    <div>
      <KRouterLink
        :text="coachStrings.$tr('reportsLabel')"
        :to="classRoute('ReportsGroupLearnerReportPage', {})"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('activityLabel')"
        :to="classRoute('ReportsGroupLearnerActivityPage', {})"
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
    name: 'ReportsGroupLearnerHeader',
    components: {},
    mixins: [commonCoach],
    $trs: {
      back: 'All learners',
    },
  };

</script>


<style lang="scss" scoped></style>
