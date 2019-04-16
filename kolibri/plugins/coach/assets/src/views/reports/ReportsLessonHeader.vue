<template>

  <div>
    <KGrid>
      <KGridItem sizes="100, 50, 50" percentage>
        <p>
          <BackLink
            :to="classRoute('ReportsLessonListPage')"
            :text="$tr('back')"
          />
        </p>
      </KGridItem>
      <KGridItem sizes="100, 50, 50" percentage alignment="right">
        <LessonOptionsDropdownMenu
          optionsFor="report"
          @select="handleSelectOption"
        />
      </KGridItem>
    </KGrid>

    <h1>
      <KLabeledIcon>
        <KIcon slot="icon" lesson />
        {{ lesson.title }}
      </KLabeledIcon>
    </h1>

    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">
          {{ coachStrings.$tr('statusLabel') }}
        </template>
        <template slot="value">
          <LessonActive :active="lesson.active" />
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">
          {{ coachStrings.$tr('recipientsLabel') }}
        </template>
        <template slot="value">
          <Recipients :groupNames="getGroupNames(lesson.groups)" />
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">
          {{ coachStrings.$tr('descriptionLabel') }}
        </template>
        <template slot="value">
          {{ lesson.description || $tr('noDescription') }}
        </template>
      </HeaderTableRow>
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
  import LessonOptionsDropdownMenu from '../plan/LessonSummaryPage/LessonOptionsDropdownMenu';

  export default {
    name: 'ReportsLessonHeader',
    components: {
      LessonOptionsDropdownMenu,
    },
    mixins: [commonCoach],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
    },
    methods: {
      handleSelectOption(action) {
        if (action === 'EDIT_DETAILS') {
          this.$router.push(this.$router.getRoute('LessonReportEditDetailsPage'));
        }
        if (action === 'MANAGE_RESOURCES') {
          this.$router.push(
            this.$router.getRoute(
              'SELECTION_ROOT',
              {},
              // So the "X" and "Cancel" buttons return back to the ReportPage
              { last: this.$route.name }
            )
          );
        }
      },
    },
    $trs: {
      back: 'All lessons',
      noDescription: 'No description',
    },
  };

</script>


<style lang="scss" scoped></style>
