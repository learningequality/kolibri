<template>

  <div>
    <p>
      <BackLink
        :to="newCoachRoute('ReportsGroupListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>Group A</h1>
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
        :to="newCoachRoute('ReportsGroupReportPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('membersLabel')"
        :to="newCoachRoute('ReportsGroupMembersPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('activityLabel')"
        :to="newCoachRoute('ReportsGroupActivityPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
    </div>
    <hr>
  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsGroupHeader',
    components: {},
    mixins: [imports],
    $trs: {
      back: 'All groups',
    },
  };

</script>


<style lang="scss" scoped></style>
