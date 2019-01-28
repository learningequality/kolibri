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
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KRouterLink
                :text="tableRow.name"
                :to="classRoute('ReportsGroupReportPage', { groupId: tableRow.id })"
              />
            </td>
            <td><Placeholder>{{ coachStrings.$tr('integer', {value: 3}) }}</Placeholder></td>
            <td><Placeholder>{{ coachStrings.$tr('integer', {value: 3}) }}</Placeholder></td>
            <td><Placeholder>{{ coachStrings.$tr('integer', {value: 4}) }}</Placeholder></td>
            <td><Placeholder><Score :value="0.8" /></Placeholder></td>
            <td><Placeholder>2 minutes ago</Placeholder></td>
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoach from '../common';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsGroupListPage',
    components: {
      ReportsHeader,
    },
    mixins: [commonCoach],
    computed: {
      ...mapGetters('classSummary', ['groups']),
      table() {
        const sorted = this.dataHelpers.sortBy(this.groups, ['name']);
        const mapped = sorted.map(group => {
          const tableRow = {};
          Object.assign(tableRow, group);
          return tableRow;
        });
        return mapped;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
