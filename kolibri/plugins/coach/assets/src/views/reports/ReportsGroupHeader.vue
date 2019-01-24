<template>

  <div>
    <p>
      <BackLink
        :to="classRoute('ReportsGroupListPage', {})"
        :text="$tr('back')"
      />
    </p>
    <h1>Group A</h1>
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('avgQuizScoreLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('percentage', {value: 0.4}) }}</template>
      </HeaderTableRow>
    </HeaderTable>
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('learnersLabel') }}</template>
        <template slot="value">
          <TruncatedItemList
            :items="[
              'John',
              'Alice',
              'Julie',
              'Lucy',
              'Steve',
              'Mary',
              'Judy',
              'George',
              'Carol',
              'Ken'
            ]"
          />
        </template>
      </HeaderTableRow>
    </HeaderTable>
    <HeaderTabs>
      <HeaderTab
        :text="coachStrings.$tr('reportsLabel')"
        :to="classRoute('ReportsGroupReportPage', {})"
      />
      <HeaderTab
        :text="coachStrings.$tr('membersLabel')"
        :to="classRoute('ReportsGroupLearnerListPage', {})"
      />
      <HeaderTab
        :text="coachStrings.$tr('activityLabel')"
        :to="classRoute('ReportsGroupActivityPage', {})"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsGroupHeader',
    components: {},
    mixins: [commonCoach],
    $trs: {
      back: 'All groups',
    },
  };

</script>


<style lang="scss" scoped></style>
