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
        <KLabeledIcon icon="person" :label="learner.name" />
      </h1>

      <ReportsResourcesStats
        :className="className"
        :lessonName="lesson.title"
      />

      <ReportsControls @export="exportCSV" />

      <CoreTable :emptyMessage="coachString('activityListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('titleLabel') }}</th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ coachString('timeSpentLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.node_id">
            <td>
              <KLabeledIcon :icon="tableRow.kind">
                <KRouterLink
                  v-if="showLink(tableRow)"
                  :text="tableRow.title"
                  :to="exerciseLink(tableRow.content_id)"
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
                :seconds="showTimeDuration(tableRow)"
              />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import { PageNames } from './../../constants';
  import ReportsControls from './ReportsControls';
  import ReportsResourcesStats from './ReportsResourcesStats';

  export default {
    name: 'ReportsLessonLearnerPage',
    components: { ReportsControls, ReportsResourcesStats },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      table() {
        const contentArray = this.lesson.node_ids.map(node_id => this.contentNodeMap[node_id]);
        return contentArray.map(content => {
          const tableRow = {
            statusObj: this.getContentStatusObjForLearner(content.content_id, this.learner.id),
          };
          Object.assign(tableRow, content);
          return tableRow;
        });
      },
    },
    methods: {
      exerciseLink(exerciseId) {
        return this.classRoute(PageNames.REPORTS_LESSON_LEARNER_EXERCISE_PAGE_ROOT, { exerciseId });
      },
      showLink(tableRow) {
        return (
          tableRow.kind === this.ContentNodeKinds.EXERCISE &&
          tableRow.statusObj.status !== this.STATUSES.notStarted
        );
      },
      showTimeDuration(tableRow) {
        if (tableRow.statusObj.status !== this.STATUSES.notStarted) {
          return tableRow.statusObj.time_spent;
        }
        return undefined;
      },
      exportCSV() {
        const columns = [
          ...csvFields.title(),
          ...csvFields.learnerProgress('statusObj.status'),
          ...csvFields.timeSpent('statusObj.time_spent'),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          lesson: this.lesson.title,
          learner: this.learner.name,
        });

        exporter.export(this.table);
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
