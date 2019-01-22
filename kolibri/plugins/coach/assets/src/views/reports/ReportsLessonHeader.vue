<template>

  <div>
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

    <div>
      <KRouterLink
        :text="coachStrings.$tr('reportLabel')"
        appearance="flat-button"
        class="new-coach-tab"
        :to="newCoachRoute('ReportsLessonReportPage')"
      />
      <KRouterLink
        :text="coachStrings.$tr('learnersLabel')"
        appearance="flat-button"
        class="new-coach-tab"
        :to="newCoachRoute('ReportsLessonLearnerListPage')"
      />
    </div>

  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsLessonHeader',
    components: {},
    mixins: [commonCoach],
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
