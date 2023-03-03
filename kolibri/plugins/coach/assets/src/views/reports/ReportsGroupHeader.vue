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

    <HeaderTabs
      :enablePrint="enablePrint"
      :style="{ marginTop: '34px' }"  
    >
      <KTabsList
        :tabsId="REPORTS_GROUP_TABS_ID"
        ariaLabel="Group reports"
        :activeTabId="activeTabId"
        :tabs="tabs"
        :style="{ position: 'relative', top: '5px' }"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { REPORTS_GROUP_TABS_ID, ReportsGroupTabs } from '../../constants/tabsConstants';

  export default {
    name: 'ReportsGroupHeader',
    mixins: [commonCoach, commonCoreStrings],
    props: {
      activeTabId: {
        type: String,
        required: true,
      },
      enablePrint: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        REPORTS_GROUP_TABS_ID,
      };
    },
    computed: {
      group() {
        return this.groupMap[this.$route.params.groupId];
      },
      tabs() {
        return [
          {
            id: ReportsGroupTabs.REPORTS,
            label: this.coachString('reportsLabel'),
            to: this.classRoute('ReportsGroupReportPage', {}),
          },
          {
            id: ReportsGroupTabs.MEMBERS,
            label: this.coachString('membersLabel'),
            to: this.classRoute('ReportsGroupLearnerListPage', {}),
          },
          {
            id: ReportsGroupTabs.ACTIVITY,
            label: this.coachString('activityLabel'),
            to: this.classRoute('ReportsGroupActivityPage', {}),
          },
        ];
      },
    },
    $trs: {
      back: {
        message: 'All groups',
        context:
          "Refers to a link that takes the user back to the 'Groups' tab in the 'Reports' section where they can see a list of all the groups in a class.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
