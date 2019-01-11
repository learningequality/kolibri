<template>

  <div>

    <p>
      <BackLink
        :to="newCoachRoute('ReportsQuizListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>Some quiz</h1>
    <KDropdownMenu
      slot="optionsDropdown"
      :text="coachStrings.$tr('optionsLabel')"
      :options="actionOptions"
      appearance="raised-button"
      @select="goTo($event.value)"
    />
    <dl>
      <dt>{{ coachStrings.$tr('statusLabel') }}</dt>
      <dd><QuizActive :active="true" /></dd>
      <dt>{{ coachStrings.$tr('recipientsLabel') }}</dt>
      <dd><Recipients :groups="[]" /></dd>
      <dt>{{ coachStrings.$tr('progressLabel') }}</dt>
      <dd>
        <LearnerProgressRatio
          :count="1"
          :total="3"
          :verbosity="2"
          verb="completed"
          icon="clock"
        />
      </dd>
      <dt>{{ coachStrings.$tr('questionOrderLabel') }}</dt>
      <dd>{{ coachStrings.$tr('orderRandomLabel') }}</dd>
    </dl>

    <div>
      <KRouterLink
        :text="coachStrings.$tr('reportLabel')"
        appearance="flat-button"
        class="new-coach-tab"
        :to="link('ReportsQuizLearnerListPage')"
      />
      <KRouterLink
        :text="coachStrings.$tr('difficultQuestionsLabel')"
        appearance="flat-button"
        class="new-coach-tab"
        :to="link('ReportsQuizQuestionListPage')"
      />
    </div>

    <hr>

  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsQuizHeader',
    components: {},
    mixins: [imports],
    computed: {
      actionOptions() {
        return [
          { label: this.coachStrings.$tr('previewAction'), value: 'ReportsQuizPreviewPage' },
          { label: this.coachStrings.$tr('editDetailsAction'), value: 'ReportsQuizEditorPage' },
        ];
      },
    },
    methods: {
      goTo(page) {
        this.$router.push(this.newCoachRoute(page));
      },
      link(page) {
        return this.newCoachRoute(page);
      },
    },
    $trs: {
      back: 'All quizzes',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
