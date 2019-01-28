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
      <ReportsHeader />
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('groupNameLabel') }}</td>
            <td>{{ coachStrings.$tr('lessonsLabel') }}</td>
            <td>{{ coachStrings.$tr('quizzesLabel') }}</td>
            <td>{{ coachStrings.$tr('learnersLabel') }}</td>
            <td>{{ coachStrings.$tr('avgQuizScoreLabel') }}</td>
            <td>{{ coachStrings.$tr('lastActivityLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr>
            <td>
              <KRouterLink
                text="Group A"
                :to="classRoute('ReportsGroupReportPage', {groupId:'___'})"
              />
            </td>
            <td>{{ coachStrings.$tr('integer', {value: 3}) }}</td>
            <td>{{ coachStrings.$tr('integer', {value: 3}) }}</td>
            <td>{{ coachStrings.$tr('integer', {value: 4}) }}</td>
            <td><Score :value="0.8" /></td>
            <td>2 minutes ago</td>
          </tr>
          <tr>
            <td>
              <KRouterLink
                text="Group B"
                :to="classRoute('ReportsGroupReportPage', {groupId:'___'})"
              />
            </td>
            <td>{{ coachStrings.$tr('integer', {value: 5}) }}</td>
            <td>{{ coachStrings.$tr('integer', {value: 4}) }}</td>
            <td>{{ coachStrings.$tr('integer', {value: 3}) }}</td>
            <td><Score :value="0.2" /></td>
            <td>10 minutes ago</td>
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsGroupListPage',
    components: {
      ReportsHeader,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
