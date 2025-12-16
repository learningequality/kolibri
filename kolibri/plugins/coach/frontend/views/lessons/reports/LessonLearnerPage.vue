<template>

  <CoachAppBarPage>
    <KPageContainer>
      <p>
        <BackLink
          :to="
            classRoute(group ? PageNames.GROUP_LESSON_SUMMARY : PageNames.LESSON_SUMMARY, {
              tabId: 'tabLearners',
            })
          "
          :text="lesson.title"
        />
      </p>
      <h1>
        <KLabeledIcon
          icon="person"
          :label="learner.name"
        />
      </h1>

      <ReportsResourcesStats
        :className="className"
        :lessonName="lesson.title"
      />

      <ReportsControls @export="exportCSV" />

      <MissingResourceAlert v-if="lesson.missing_resource" />

      <CoreTable :emptyMessage="coachString('activityListEmptyState')">
        <template #headers>
          <th>{{ coachString('titleLabel') }}</th>
          <th>{{ coreString('progressLabel') }}</th>
          <th>{{ coreString('timeSpentLabel') }}</th>
        </template>
        <template #tbody>
          <transition-group
            tag="tbody"
            name="list"
          >
            <tr
              v-for="tableRow in table"
              :key="tableRow.node_id"
            >
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
                <StatusSimple
                  v-if="tableRow.statusObj"
                  :status="tableRow.statusObj.status"
                />
                <KEmptyPlaceholder v-else />
              </td>
              <td>
                <TimeDuration
                  v-if="tableRow.statusObj"
                  :seconds="showTimeDuration(tableRow)"
                />
                <KEmptyPlaceholder v-else />
              </td>
            </tr>
          </transition-group>
        </template>
      </CoreTable>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert';
  import commonCoach from '../../common';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import CSVExporter from '../../../csv/exporter';
  import * as csvFields from '../../../csv/fields';
  import { PageNames } from '../../../constants';
  import ReportsControls from '../../common/ReportsControls';
  import ReportsResourcesStats from '../../common/tables/ReportsResourcesStats';

  export default {
    name: 'LessonLearnerPage',
    components: {
      CoachAppBarPage,
      MissingResourceAlert,
      ReportsControls,
      ReportsResourcesStats,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        PageNames,
      };
    },
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      group() {
        return this.$route.params.groupId && this.groupMap[this.$route.params.groupId];
      },
      table() {
        const contentArray = this.lesson.node_ids.map(node_id => this.contentNodeMap[node_id]);
        return contentArray.map((content, index) => {
          if (!content) {
            return this.missingResourceObj(index);
          }
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
        return this.classRoute(PageNames.LESSON_LEARNER_EXERCISE_PAGE_ROOT, { exerciseId });
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

        if (this.group) {
          exporter.addNames({
            group: this.group.name,
          });
        }

        exporter.export(this.table);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
