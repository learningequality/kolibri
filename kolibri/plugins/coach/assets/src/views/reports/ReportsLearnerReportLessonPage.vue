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
          :to="classRoute('ReportsLearnerReportPage')"
          :text="learner.name"
        />
      </p>
      <h1>
        <KLabeledIcon>
          <KIcon slot="icon" lesson />
          {{ lesson.title }}
        </KLabeledIcon>
      </h1>
      <HeaderTable>
        <HeaderTableRow>
          <template slot="key">
            {{ common$tr('statusLabel') }}
          </template>
          <template slot="value">
            <LessonActive :active="lesson.active" />
          </template>
        </HeaderTableRow>
        <!-- TODO COACH
        <HeaderTableRow>
          <template slot="key">{{ common$tr('descriptionLabel') }}</template>
          <template slot="value">Ipsum lorem</template>
        </HeaderTableRow>
         -->
      </HeaderTable>

      <CoreTable :emptyMessage="emptyMessage">
        <thead slot="thead">
          <tr>
            <th>{{ common$tr('titleLabel') }}</th>
            <th>{{ common$tr('progressLabel') }}</th>
            <th>{{ common$tr('timeSpentLabel') }}</th>
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
                  :to="classRoute(
                    'ReportsLearnerReportLessonExercisePage',
                    { exerciseId: tableRow.content_id }
                  )"
                />
                <template v-else>
                  {{ tableRow.title }}
                </template>
              </KLabeledIcon>
            </td>
            <td>
              <StatusSimple :status="tableRow.statusObj.status" />
            </td>
            <td>
              <TimeDuration
                :seconds="showTime(tableRow)"
              />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import LessonSummaryPage from '../plan/LessonSummaryPage';

  export default {
    name: 'ReportsLearnerReportLessonPage',
    mixins: [commonCoach],
    computed: {
      emptyMessage() {
        return this.$tr('noResourcesInLesson');
      },
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      table() {
        const contentArray = this.lesson.node_ids.map(node_id => this.contentNodeMap[node_id]);
        const sorted = this._.sortBy(contentArray, ['title']);
        return sorted.map(content => {
          const tableRow = {
            statusObj: this.getContentStatusObjForLearner(content.content_id, this.learner.id),
          };
          Object.assign(tableRow, content);
          return tableRow;
        });
      },
    },
    methods: {
      showLink(tableRow) {
        return (
          tableRow.kind === this.ContentNodeKinds.EXERCISE &&
          tableRow.statusObj.status !== this.STATUSES.notStarted
        );
      },
      showTime(tableRow) {
        if (tableRow.statusObj.status !== this.STATUSES.notStarted) {
          return tableRow.statusObj.time_spent;
        }
        return undefined;
      },
    },
    $trs: {
      lessonProgressLabel: "'{lesson}' progress",
      noResourcesInLesson: 'No resources in this lesson',
    },
  };

</script>


<style lang="scss" scoped></style>
