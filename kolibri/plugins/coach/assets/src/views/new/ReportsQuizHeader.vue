<template>

  <div>

    <p>
      <BackLink
        :to="{ name:'NEW_COACH_PAGES', params: {page: 'ReportsLessonListPage'} }"
        :text="$tr('back')"
      />
    </p>
    <h1>Some quiz</h1>
    <KDropdownMenu
      slot="optionsDropdown"
      :text="$tr('options')"
      :options="actionOptions"
      appearance="raised-button"
      @select="goTo($event.value)"
    />
    <dl>
      <dt>{{ $tr('status') }}</dt>
      <dd><QuizActive :active="true" /></dd>
      <dt>{{ $tr('recipients') }}</dt>
      <dd><Recipients :groups="[]" /></dd>
      <dt>{{ $tr('progress') }}</dt>
      <dd><Completed :count="3" :total="10" :verbosity="1" /></dd>
      <dt>{{ $tr('questionOrder') }}</dt>
      <dd>{{ coachStrings.$tr('orderRandomLabel') }}</dd>
    </dl>

    <div>
      <KRouterLink
        :text="$tr('learnerReport')"
        appearance="flat-button"
        class="new-coach-tab"
        :to="link('ReportsQuizLearnerListPage')"
      />
      <KRouterLink
        :text="$tr('difficulties')"
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
          { label: this.$tr('preview'), value: 'ReportsQuizPreviewPage' },
          { label: this.$tr('editDetails'), value: 'ReportsQuizEditorPage' },
        ];
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
      link(page) {
        return { name: 'NEW_COACH_PAGES', params: { page } };
      },
    },
    $trs: {
      back: 'All quizzes',
      editDetails: 'Edit details',
      preview: 'Preview',
      options: 'Options',
      learnerReport: 'Report',
      status: 'Status',
      recipients: 'Recipients',
      progress: 'Progress',
      questionOrder: 'Question order',
      questionOrderFixed: 'Fixed',
      questionOrderRandom: 'Randomized',
      difficulties: 'Difficult questions',
      viewByGroups: 'View by groups',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
