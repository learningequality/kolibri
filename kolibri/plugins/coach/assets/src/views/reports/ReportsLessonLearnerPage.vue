<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <p>
        <BackLink
          :to="classRoute('ReportsLessonLearnerListPage')"
          :text="lesson.title"
        />
      </p>
      <h1>
        <KLabeledIcon>
          <KIcon slot="icon" person />
          {{ learner.name }}
        </KLabeledIcon>
      </h1>

      <CoreTable :emptyMessage="coachStrings.$tr('activityListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachStrings.$tr('titleLabel') }}</th>
            <th>{{ coachStrings.$tr('progressLabel') }}</th>
            <th>{{ coachStrings.$tr('timeSpentLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.node_id">
            <td>
              <KLabeledIcon>
                <KBasicContentIcon slot="icon" :kind="tableRow.kind" />
                <KRouterLink
                  v-if="showLink(tableRow)"
                  :text="tableRow.title"
                  :to="exerciseLink(tableRow.content_id)"
                />
                <template v-else>{{ tableRow.title }}</template>
              </KLabeledIcon>
            </td>
            <td>
              <StatusSimple :status="tableRow.statusObj.status" />
            </td>
            <td><TimeDuration
              v-if="tableRow.statusObj.status !== STATUSES.notStarted"
              :seconds="tableRow.statusObj.time_spent"
            /></td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import { STATUSES } from '../../modules/classSummary/constants';
  import { PageNames } from './../../constants';

  export default {
    name: 'ReportsLessonLearnerPage',
    components: {},
    mixins: [commonCoach],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      table() {
        const contentArray = this.lesson.node_ids.map(node_id => this.contentNodeMap[node_id]);
        const sorted = this._.sortBy(contentArray, ['title']);
        const mapped = sorted.map(content => {
          const tableRow = {
            statusObj: this.getContentStatusObjForLearner(content.content_id, this.learner.id),
          };
          Object.assign(tableRow, content);
          return tableRow;
        });
        return mapped;
      },
    },
    methods: {
      exerciseLink(exerciseId) {
        return this.classRoute(PageNames.REPORTS_LESSON_LEARNER_EXERCISE_PAGE_ROOT, { exerciseId });
      },
      showLink(tableRow) {
        return (
          tableRow.kind === this.ContentNodeKinds.EXERCISE &&
          tableRow.statusObj.status !== STATUSES.notStarted
        );
      },
    },
    $trs: {
      lessonProgressLabel: "'{lesson}' progress",
    },
  };

</script>


<style lang="scss" scoped></style>
