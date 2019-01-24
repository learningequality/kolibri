<template>

  <div>

    <p>
      <BackLink
        :to="classRoute('ReportsQuizListPage', {})"
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
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('statusLabel') }}</template>
        <template slot="value"><QuizActive :active="true" /></template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('recipientsLabel') }}</template>
        <template slot="value"><Recipients :groups="[]" /></template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('progressLabel') }}</template>
        <template slot="value">
          <LearnerProgressRatio
            :count="1"
            :total="3"
            :verbosity="2"
            verb="completed"
            icon="clock"
          />
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('questionOrderLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('orderRandomLabel') }}</template>
      </HeaderTableRow>
    </HeaderTable>

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

  import commonCoach from '../common';

  export default {
    name: 'ReportsQuizHeader',
    components: {},
    mixins: [commonCoach],
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
        this.$router.push(this.classRoute(page, {}));
      },
      link(page) {
        return this.classRoute(page, {});
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
