<template>

  <CoachAppBarPage>
    <KPageContainer>
      <p>
        <BackLink
          :to="classRoute(PageNames.LEARNER_SUMMARY)"
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
          <template #key>
            {{ coreString('learnerLabel') }}
          </template>
          <template #value>
            {{ learner.name }}
          </template>
        </HeaderTableRow>
        <HeaderTableRow v-show="!$isPrint">
          <template #key>
            {{ coachString('statusLabel') }}
          </template>
          <!--           <template #value>
            <LessonActive :active="lesson.active" />
          </template> -->
        </HeaderTableRow>
        <HeaderTableRow v-show="!$isPrint">
          <template #key>
            {{ coachString('descriptionLabel') }}
          </template>
          <template #value>
            <span dir="auto">
              {{ lesson.description || coachString('descriptionMissingLabel') }}
            </span>
          </template>
        </HeaderTableRow>
      </HeaderTable>

      <ReportsControls @export="exportCSV" />

      <CoreTable :emptyMessage="emptyMessage">
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
                    :to="tableRow.link"
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
                  :seconds="showTime(tableRow)"
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
  import { PageNames } from '../../../constants';
  import commonCoach from '../../common';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import CSVExporter from '../../../csv/exporter';
  import * as csvFields from '../../../csv/fields';
  import ReportsControls from '../../common/ReportsControls';

  export default {
    name: 'LearnerLessonPage',
    components: {
      CoachAppBarPage,
      ReportsControls,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        PageNames,
      };
    },
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
        return contentArray.map((content, index) => {
          if (!content) {
            return this.missingResourceObj(index);
          }
          const tableRow = {
            statusObj: this.getContentStatusObjForLearner(content.content_id, this.learner.id),
            link: this.classRoute(PageNames.LESSON_LEARNER_EXERCISE_PAGE_ROOT, {
              exerciseId: content.content_id,
              learnerId: this.learner.id,
            }),
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
  };

</script>


<style lang="scss" scoped>

  @import '../../common/print-table';

</style>
