<template>

  <div>
    <p>
      <BackLink
        :to="classRoute('ReportsGroupListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>
      <KLabeledIcon icon="group" :label="group.name" />
    </h1>

    <!-- TODO COACH
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">
          {{ coachString('avgQuizScoreLabel') }}
        </template>
        <template slot="value">
          {{ coachString('percentage', {value: avgScore}) }}
        </template>
      </HeaderTableRow>
    </HeaderTable>
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coreString('learnersLabel') }}</template>
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
     -->

    <HeaderTabs :enablePrint="enablePrint">
      <HeaderTab
        :text="coachString('reportsLabel')"
        :to="classRoute('ReportsGroupReportPage', {})"
      />
      <HeaderTab
        :text="coachString('membersLabel')"
        :to="classRoute('ReportsGroupLearnerListPage', {})"
      />
      <HeaderTab
        :text="coachString('activityLabel')"
        :to="classRoute('ReportsGroupActivityPage', {})"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';

  export default {
    name: 'ReportsGroupHeader',
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
      group() {
        return this.groupMap[this.$route.params.groupId];
      },
      /** TODO COACH
      recipients() {
        return this.group.member_ids;
      },
      avgScore() {
        const examStatuses = this.examStatuses.filter(status =>
          this.recipients.includes(status.learner_id)
        );
        const statuses = examStatuses.filter(status => status.status === this.STATUSES.completed);
        if (!statuses.length) {
          return null;
        }
        return this._.meanBy(statuses, 'score');
      },
      */
    },
    $trs: {
      back: 'All groups',
    },
  };

</script>


<style lang="scss" scoped></style>
