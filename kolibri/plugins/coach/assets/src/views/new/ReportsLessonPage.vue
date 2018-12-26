<template>

  <div class="new-coach-block">
    <p>
      <BackLink
        :to="newCoachRoute('ReportsLessonListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>Some Lesson</h1>
    <KDropdownMenu
      slot="optionsDropdown"
      :text="coachStrings.$tr('optionsLabel')"
      :options="actionOptions"
      appearance="raised-button"
      @select="goTo($event.value)"
    />
    <dl>
      <dt>{{ coachStrings.$tr('statusLabel') }}</dt>
      <dd><LessonActive :active="true" /></dd>
      <dt>{{ coachStrings.$tr('recipientsLabel') }}</dt>
      <dd>Group 1, Group 2</dd>
      <dt>{{ coachStrings.$tr('descriptionLabel') }}</dt>
      <dd>Ipsum lorem</dd>
    </dl>

    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ coachStrings.$tr('titleLabel') }}</td>
          <td>{{ coachStrings.$tr('progressLabel') }}</td>
          <td>{{ coachStrings.$tr('avgTimeSpentLabel') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <KRouterLink
              text="Some exercise"
              :to="newCoachRoute('ReportsLessonExerciseLearnerListPage')"
            />
          </td>
          <td>
            <LearnerProgressRatio
              :count="2"
              :total="10"
              verbosity="1"
              verb="completed"
              icon="learners"
            />
            <LearnerProgressCount
              verb="needHelp"
              icon="help"
              :count="1"
              :verbosity="0"
            />

          </td>
          <td><TimeDuration :seconds="360" /></td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="Some video"
              :to="newCoachRoute('ReportsLessonResourceLearnerListPage')"
            />
          </td>
          <td>
            <LearnerProgressRatio
              :count="3"
              :total="6"
              verbosity="1"
              verb="completed"
              icon="learners"
            />

          </td>
          <td><TimeDuration :seconds="120" /></td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsLessonPage',
    components: {},
    mixins: [imports],
    computed: {
      actionOptions() {
        return [
          { label: this.coachStrings.$tr('editDetailsAction'), value: 'ReportsLessonEditorPage' },
          {
            label: this.coachStrings.$tr('manageResourcesAction'),
            value: 'ReportsLessonManagerPage',
          },
        ];
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {
      back: 'All lessons',
    },
  };

</script>


<style lang="scss" scoped></style>
