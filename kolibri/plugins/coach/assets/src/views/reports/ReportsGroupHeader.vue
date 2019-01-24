<template>

  <div>
    <p>
      <BackLink
        :to="classRoute('ReportsGroupListPage', {})"
        :text="$tr('back')"
      />
    </p>
    <h1>Group A</h1>
    <dl>
      <dt>{{ coachStrings.$tr('avgQuizScoreLabel') }}</dt>
      <dd>{{ coachStrings.$tr('percentage', {value: 0.4}) }}</dd>
    </dl>
    <dl>
      <dt>{{ coachStrings.$tr('learnersLabel') }}</dt>
      <dd>
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
      </dd>
    </dl>
    <div>
      <KRouterLink
        :text="coachStrings.$tr('reportsLabel')"
        :to="classRoute('ReportsGroupReportPage', {})"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('membersLabel')"
        :to="classRoute('ReportsGroupLearnerListPage', {})"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('activityLabel')"
        :to="classRoute('ReportsGroupActivityPage', {})"
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
    name: 'ReportsGroupHeader',
    components: {},
    mixins: [commonCoach],
    $trs: {
      back: 'All groups',
    },
  };

</script>


<style lang="scss" scoped></style>
