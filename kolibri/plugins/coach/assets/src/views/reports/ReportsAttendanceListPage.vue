<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <ReportsHeader />
      <!-- TODO COACH
      <KCheckbox :label="coachStrings.$tr('viewByGroupsLabel')" />
      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
       -->
      <CoreTable :emptyMessage="coachStrings.$tr('learnerListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachStrings.$tr('usernameLabel') }}</th>
            <th>{{ coachStrings.$tr('fullNameLabel') }}</th>
            <th>{{ coachStrings.$tr('statusLabel') }}</th>
            <th>{{ coachStrings.$tr('lastLoggedInLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" person />
                <KRouterLink
                  :text="tableRow.username"
                  :to="classRoute('ReportsLearnerReportPage', { learnerId: tableRow.id })"
                />
              </KLabeledIcon>
            </td>
            <td>{{ tableRow.name }}</td>
            <td><LessonActive :active="tableRow.active" /></td>
            <td>{{ tableRow.lastLoggedIn }}</td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsAttendanceListPage',
    components: {
      ReportsHeader,
    },
    mixins: [commonCoach],
    computed: {
      table() {
        const sorted = this._.sortBy(this.learners, ['name']);
        const mapped = sorted.map(learner => {
          const augmentedObj = {
            active: this.active(learner),
            lastLoggedIn: this.lastLoggedIn(learner),
          };
          Object.assign(augmentedObj, learner);
          return augmentedObj;
        });
        return mapped;
      },
    },
    methods: {
      active(learner) {
        return this.activeLearners.includes(learner.username);
      },
      lastLoggedIn(learner) {
        if (!this.active(learner)) {
          for (let i = 0; i < this.learnersInfo.length; i++) {
            if (this.learnersInfo[i].user__username == learner.username) {
              const lastLoggedInDate = new Date(
                this.learnersInfo[i].last_interaction_timestamp__max
              );
              return lastLoggedInDate.toDateString();
            }
          }
          return this.coachStrings.$tr('neverLoggedInLabel');
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
