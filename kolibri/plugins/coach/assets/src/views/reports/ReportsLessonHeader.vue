<template>

  <div>
    <p>
      <BackLink
        :to="classRoute('ReportsLessonListPage', {})"
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
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('statusLabel') }}</template>
        <template slot="value"><LessonActive :active="true" /></template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('recipientsLabel') }}</template>
        <template slot="value">Group 1, Group 2</template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('descriptionLabel') }}</template>
        <template slot="value">Ipsum lorem</template>
      </HeaderTableRow>
    </HeaderTable>

    <div>
      <KRouterLink
        :text="coachStrings.$tr('reportLabel')"
        appearance="flat-button"
        class="new-coach-tab"
        :to="classRoute('ReportsLessonReportPage', {})"
      />
      <KRouterLink
        :text="coachStrings.$tr('learnersLabel')"
        appearance="flat-button"
        class="new-coach-tab"
        :to="classRoute('ReportsLessonLearnerListPage', {})"
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
