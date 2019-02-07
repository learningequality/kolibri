<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <ReportsGroupHeader />
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>{{ coachStrings.$tr('nameLabel') }}</th>
            <th>{{ coachStrings.$tr('avgQuizScoreLabel') }}</th>
            <th>{{ coachStrings.$tr('exercisesCompletedLabel') }}</th>
            <th>{{ coachStrings.$tr('resourcesViewedLabel') }}</th>
            <th>{{ coachStrings.$tr('lastActivityLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" person />
                {{ tableRow.name }}
              </KLabeledIcon>
            </td>
            <td><Score :value="tableRow.avgScore" /></td>
            <td>{{ coachStrings.$tr('integer', {value: tableRow.exercises}) }}</td>
            <td>{{ coachStrings.$tr('integer', {value: tableRow.resources}) }}</td>
            <td><ElapsedTime :date="tableRow.lastActivity" /></td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
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
      groupMembers() {
        return this.groupMap[this.$route.params.groupId].member_ids.map(
          memberId => this.learnerMap[memberId]
        );
      },
      table() {
        const sorted = this._.sortBy(this.groupMembers, ['name']);
        const mapped = sorted.map(learner => {
          const examStatuses = this.examStatuses.filter(status => learner.id === status.learner_id);
          const contentStatuses = this.contentStatuses.filter(
            status => learner.id === status.learner_id
          );
          const augmentedObj = {
            avgScore: this.avgScore(examStatuses),
            lessons: undefined,
            exercises: this.exercisesCompleted(contentStatuses),
            resources: this.resourcesViewed(contentStatuses),
            lastActivity: this.lastActivity(examStatuses, contentStatuses),
          };
          Object.assign(augmentedObj, learner);
          return augmentedObj;
        });
        return mapped;
      },
    },
    methods: {
      avgScore(examStatuses) {
        const statuses = examStatuses.filter(status => status.status === this.STATUSES.completed);
        if (!statuses.length) {
          return null;
        }
        return this._.meanBy(statuses, 'score');
      },
      lastActivity(examStatuses, contentStatuses) {
        const statuses = [...examStatuses, ...contentStatuses];
        if (!statuses.length) {
          return null;
        }
        return this._.maxBy(statuses, 'last_activity').last_activity;
      },
      exercisesCompleted(contentStatuses) {
        const statuses = contentStatuses.filter(
          status =>
            this.contentMap[status.content_id].kind === 'exercise' &&
            status.status === this.STATUSES.completed
        );
        return statuses.length;
      },
      resourcesViewed(contentStatuses) {
        const statuses = contentStatuses.filter(
          status =>
            this.contentMap[status.content_id].kind !== 'exercise' &&
            status.status !== this.STATUSES.notStarted
        );
        return statuses.length;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
