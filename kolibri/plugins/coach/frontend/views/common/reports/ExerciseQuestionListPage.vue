<template>

  <CoachAppBarPage>
    <KPageContainer>
      <ReportsResourceHeader
        :resource="resource"
        @previewClick="onPreviewClick"
      />

      <ReportsControls @export="exportCSV" />

      <CoreTable :emptyMessage="coachString('questionListEmptyState')">
        <template #headers>
          <th>{{ coachString('questionLabel') }}</th>
          <th>{{ coachString('helpNeededLabel') }}</th>
        </template>
        <template #tbody>
          <transition-group
            tag="tbody"
            name="list"
          >
            <tr
              v-for="tableRow in table"
              :key="tableRow.question_id"
            >
              <td>
                <KRouterLink
                  v-if="exercise.available"
                  :text="tableRow.title"
                  :to="questionLink(tableRow.question_id)"
                  icon="question"
                />
                <span v-else> <KIcon icon="question" />{{ tableRow.title }} </span>
              </td>
              <td>
                <LearnerProgressRatio
                  :verb="VERBS.needHelp"
                  :icon="ICONS.help"
                  :total="tableRow.total"
                  :count="tableRow.total - tableRow.correct"
                  :verbosity="1"
                />
              </td>
            </tr>
          </transition-group>
        </template>
      </CoreTable>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import commonCoach from '../../common';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import LearnerProgressRatio from '../../common/status/LearnerProgressRatio';
  import CSVExporter from '../../../csv/exporter';
  import * as csvFields from '../../../csv/fields';
  import ReportsResourceHeader from '../../common/ReportsResourceHeader';
  import ReportsControls from '../../common/ReportsControls';
  import { PageNames } from '../../../constants';

  export default {
    name: 'ExerciseQuestionListPage',
    components: {
      CoachAppBarPage,
      ReportsResourceHeader,
      ReportsControls,
      LearnerProgressRatio,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('questionList', ['exercise']),
      ...mapState('resourceDetail', ['resource']),
      ...mapGetters('questionList', ['difficultQuestions']),
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      group() {
        return this.$route.params.groupId && this.groupMap[this.$route.params.groupId];
      },
      table() {
        return this.difficultQuestions.map(question => {
          const tableRow = {};
          Object.assign(tableRow, question);
          return tableRow;
        });
      },
    },
    methods: {
      questionLink(questionId) {
        return this.classRoute(PageNames.LESSON_EXERCISE_QUESTION_PAGE_ROOT, {
          questionId,
          exerciseId: this.$route.params.exerciseId,
        });
      },
      exportCSV() {
        const columns = [...csvFields.questionTitle(), ...csvFields.helpNeeded()];

        const exporter = new CSVExporter(columns, this.className);
        const names = {
          lesson: this.lesson.title,
          resource: this.resource.title,
          difficultQuestions: this.coachString('difficultQuestionsLabel'),
        };

        if (this.group) {
          names.group = this.group.name;
        }

        exporter.addNames(names);

        exporter.export(this.table);
      },
      onPreviewClick() {
        this.$router.push(
          this.$router.getRoute(
            'RESOURCE_CONTENT_PREVIEW',
            {
              contentId: this.exercise.id,
            },
            this.defaultBackLinkQuery,
          ),
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../common/print-table';

  .stats {
    margin-right: 16px;
  }

</style>
