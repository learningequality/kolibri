<template>

  <div>
    <p>
      <BackLink
        :to="classRoute('ReportsLessonListPage')"
        :text="$tr('back')"
      />
    </p>
    <KGrid>
      <KGridItem sizes="100, 50, 50" percentage>
        <h1>{{ lesson.title }}</h1>
      </KGridItem>
      <KGridItem sizes="100, 50, 50" percentage alignment="right">
        <!-- TODO COACH
        <KDropdownMenu
          :text="coachStrings.$tr('optionsLabel')"
          :options="actionOptions"
          appearance="raised-button"
          @select="goTo($event.value)"
        />
         -->
      </KGridItem>
    </KGrid>

    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('statusLabel') }}</template>
        <template slot="value"><LessonActive :active="lesson.active" /></template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('recipientsLabel') }}</template>
        <template slot="value">
          <Recipients :groupNames="getGroupNames(lesson.groups)" />
        </template>
      </HeaderTableRow>
      <!-- TODO COACH
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('descriptionLabel') }}</template>
        <template slot="value">{{ lesson.description }}</template>
      </HeaderTableRow>
       -->
    </HeaderTable>

    <HeaderTabs>

      <HeaderTab
        :text="coachStrings.$tr('reportLabel')"
        :to="classRoute('ReportsLessonReportPage', {})"
      />
      <HeaderTab
        :text="coachStrings.$tr('learnersLabel')"
        :to="classRoute('ReportsLessonLearnerListPage', {})"
      />
    </HeaderTabs>

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
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
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
