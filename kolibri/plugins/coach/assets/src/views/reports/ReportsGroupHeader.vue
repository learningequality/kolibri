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
    },
    $trs: {
      back: 'All groups',
    },
  };

</script>


<style lang="scss" scoped></style>
