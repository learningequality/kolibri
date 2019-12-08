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
        <KLabeledIcon icon="lesson">
          {{ lesson.title }}
        </KLabeledIcon>
      </h1>
      <HeaderTable>
        <HeaderTableRow v-if="$isPrint">
          <template slot="key">
            {{ coreString('learnerLabel') }}
          </template>
          <template slot="value">
            {{ learner.name }}
          </template>
        </HeaderTableRow>
        <HeaderTableRow v-show="!$isPrint">
          <template slot="key">
            {{ coachString('statusLabel') }}
          </template>
          <template slot="value">
            <LessonActive :active="lesson.active" />
          </template>
        </HeaderTableRow>
        <HeaderTableRow v-show="!$isPrint">
          <template slot="key">
            {{ coachString('descriptionLabel') }}
          </template>
          <template slot="value">
            <span dir="auto">
              {{ lesson.description || coachString('descriptionMissingLabel') }}
            </span>
          </template>
        </HeaderTableRow>
      </HeaderTable>

      <ReportsControls @export="exportCSV" />

      <CoreTable :emptyMessage="emptyMessage">
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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsControls from './ReportsControls';

  export default {
    name: 'ReportsLearnerReportLessonPage',
    components: {
      ReportsControls,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      emptyMessage() {
        return this.coachString('noResourcesInLessonLabel');
      },
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
      exportCSV() {
        const columns = [
          ...csvFields.title(),
          ...csvFields.learnerProgress('statusObj.status'),
          ...csvFields.timeSpent('statusObj.time_spent'),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          learner: this.learner.name,
          lesson: this.lesson.title,
        });

        exporter.export(this.table);
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

</style>
