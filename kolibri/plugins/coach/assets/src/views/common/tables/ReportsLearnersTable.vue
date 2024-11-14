<template>

  <CoreTable :emptyMessage="coachString('learnerListEmptyState')">
    <template #headers>
      <th>{{ coachString('nameLabel') }}</th>
      <th>{{ coreString('progressLabel') }}</th>
      <th v-if="anyScore">
        {{ coreString('scoreLabel') }}
      </th>
      <th v-if="anyTries">
        {{ coachString('attemptsLabel') }}
      </th>
      <th v-if="anyTimeSpent">
        {{ coreString('timeSpentLabel') }}
      </th>
      <th v-if="showGroupsColumn">
        {{ coachString('groupsLabel') }}
      </th>
      <th v-if="anyLastActivity">
        {{ coachString('lastActivityLabel') }}
      </th>
    </template>
    <template #tbody>
      <transition-group
        tag="tbody"
        name="list"
      >
        <tr
          v-for="tableRow in entries"
          :key="tableRow.id"
          data-test="entry"
        >
          <td>
            <KLabeledIcon icon="person">
              <KRouterLink
                v-if="showLink(tableRow)"
                :text="tableRow.name"
                :to="tableRow.link"
                data-test="learner-link"
              />
              <template v-else>
                {{ tableRow.name }}
              </template>
            </KLabeledIcon>
          </td>
          <td v-if="!showQuizStatus(tableRow)">
            <StatusSimple :status="tableRow.statusObj.status" />
          </td>
          <td v-else-if="tableRow.statusObj.status !== STATUSES.started">
            <StatusSimple :status="tableRow.statusObj.status" />
            <div
              class="small-answered-count"
              :style="answerCountColorStyles"
            >
              {{ completedQuestionsCountLabel(tableRow.statusObj.num_answered, questionCount) }}
            </div>
          </td>
          <td v-else>
            <KLabeledIcon>
              <template #icon>
                <KIcon
                  :color="$themeTokens.progress"
                  icon="inProgress"
                />
              </template>
              {{
                $tr('questionsCompletedRatioLabel', {
                  count: tableRow.statusObj.num_answered || 0,
                  total: questionCount,
                })
              }}
            </KLabeledIcon>
          </td>
          <td v-if="anyScore">
            <Score
              v-if="tableRow.statusObj.status === STATUSES.completed"
              :value="tableRow.statusObj.num_correct / questionCount || 0.0"
              :diff="getDiff(tableRow)"
            />
          </td>
          <td v-if="anyTries">
            {{ tableRow.statusObj.tries }}
          </td>
          <td v-if="anyTimeSpent">
            <TimeDuration :seconds="timeDuration(tableRow)" />
          </td>
          <td v-if="showGroupsColumn">
            <TruncatedItemList :items="tableRow.groups" />
          </td>
          <td v-if="anyLastActivity">
            <ElapsedTime :date="elapsedTime(tableRow)" />
          </td>
        </tr>
      </transition-group>
    </template>
  </CoreTable>

</template>


<script>

  import isUndefined from 'lodash/isUndefined';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonCoach from '../../common';
  import * as csvFields from '../../../csv/fields';
  import CSVExporter from '../../../csv/exporter';

  export default {
    name: 'ReportsLearnersTable',
    mixins: [commonCoach, commonCoreStrings],
    props: {
      entries: {
        type: Array,
        default: () => [],
      },
      showGroupsColumn: {
        type: Boolean,
        default: true,
      },
      questionCount: {
        type: Number,
        default: 0,
      },
    },
    computed: {
      answerCountColorStyles() {
        return {
          color: this.$themeTokens.annotation,
        };
      },
      anyLastActivity() {
        return this.entries.some(entry => !isUndefined(entry.statusObj.last_activity));
      },
      anyScore() {
        return (
          this.questionCount &&
          this.entries.some(entry => !isUndefined(entry.statusObj.num_correct))
        );
      },
      anyTimeSpent() {
        return this.entries.some(entry => !isUndefined(entry.statusObj.time_spent));
      },
      anyTries() {
        return this.entries.some(entry => !isUndefined(entry.statusObj.tries));
      },
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
    },
    methods: {
      completedQuestionsCountLabel(answered, total) {
        if (answered === total) {
          return this.$tr('allQuestionsAnswered');
        } else {
          return this.$tr('questionsCompletedRatioLabel', { count: answered || 0, total: total });
        }
      },
      showLink(entry) {
        return entry.link && entry.statusObj.status !== this.STATUSES.notStarted;
      },
      timeDuration(entry) {
        if (entry.statusObj.status !== this.STATUSES.notStarted) {
          return entry.statusObj.time_spent;
        }

        return null;
      },
      elapsedTime(entry) {
        if (entry.statusObj.status !== this.STATUSES.notStarted) {
          return entry.statusObj.last_activity;
        }

        return null;
      },
      getDiff(entry) {
        if (entry.statusObj.status === this.STATUSES.completed && entry.statusObj.tries > 1) {
          return (
            (entry.statusObj.num_correct - entry.statusObj.previous_num_correct) /
            this.questionCount
          );
        }

        return null;
      },
      showQuizStatus(entry) {
        return this.questionCount && !isUndefined(entry.statusObj.num_answered);
      },
      /**
       * @public
       */
      exportCSV() {
        const columns = [
          ...csvFields.name(),
          ...csvFields.learnerProgress('statusObj.status'),
          ...csvFields.score(),
          ...csvFields.quizQuestionsAnswered(this.exam),
          ...csvFields.list('groups', 'groupsLabel'),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          resource: this.exam.title,
        });

        exporter.export(this.entries);
      },
    },
    $trs: {
      allQuestionsAnswered: {
        message: 'All questions answered',
        context: 'Indicates that a learner has answered all the questions in an exercise.',
      },
      questionsCompletedRatioLabel: {
        message:
          '{count, number, integer} of {total, number, integer} questions {count, plural, other {answered}}',
        context:
          "Refers to the amount of questions answered by a learner based on the total number of questions in a quiz. For example:\n\n'3 of 10 questions answered'",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../print-table';

  .small-answered-count {
    display: block;
    margin-left: 1.75rem; /* matches KLabeledIcon */
    font-size: small;
  }

</style>
