<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <ReportsGroupHeader />
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('nameLabel') }}</td>
            <td>{{ coachStrings.$tr('avgQuizScoreLabel') }}</td>
            <td>{{ coachStrings.$tr('lessonsAssignedLabel') }}</td>
            <td>{{ coachStrings.$tr('exercisesCompletedLabel') }}</td>
            <td>{{ coachStrings.$tr('resourcesViewedLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr>
            <td><KRouterLink text="Alice" :to="link" /></td>
            <td><Score :value="0.8" /></td>
            <td>{{ coachStrings.$tr('integer', {value: 3}) }}</td>
            <td>{{ coachStrings.$tr('integer', {value: 4}) }}</td>
            <td>{{ coachStrings.$tr('integer', {value: 5}) }}</td>
          </tr>
          <tr>
            <td><KRouterLink text="John" :to="link" /></td>
            <td><Score :value="0.2" /></td>
            <td>{{ coachStrings.$tr('integer', {value: 5}) }}</td>
            <td>{{ coachStrings.$tr('integer', {value: 4}) }}</td>
            <td>{{ coachStrings.$tr('integer', {value: 3}) }}</td>
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ReportsGroupHeader from './ReportsGroupHeader';

  export default {
    name: 'ReportsGroupLearnerListPage',
    components: {
      ReportsGroupHeader,
    },
    mixins: [commonCoach],
    computed: {
      link() {
        return this.classRoute('ReportsGroupLearnerReportPage', { learnerId: '___' });
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
