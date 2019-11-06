<template>

  <div>
    <HeaderWithOptions>
      <BackLink
        slot="header"
        :to="classRoute('ReportsLessonListPage')"
        :text="coreString('allLessonsLabel')"
      />
      <LessonOptionsDropdownMenu
        slot="options"
        optionsFor="report"
        @select="handleSelectOption"
      />
    </HeaderWithOptions>

    <h1>
      <KLabeledIcon icon="lesson" :label="lesson.title" />
    </h1>

    <HeaderTable>
      <HeaderTableRow :keyText="coachString('statusLabel')">
        <LessonActive
          slot="value"
          :active="lesson.active"
        />
      </HeaderTableRow>
      <HeaderTableRow :keyText="coachString('recipientsLabel')">
        <Recipients
          slot="value"
          :groupNames="getGroupNames(lesson.groups)"
          :hasAssignments="lesson.assignments.length > 0"
        />
      </HeaderTableRow>
      <HeaderTableRow
        :keyText="coachString('descriptionLabel')"
        :valueText="lesson.description || coachString('descriptionMissingLabel')"
      />
    </HeaderTable>

    <HeaderTabs>

      <HeaderTab
        :text="coachString('reportLabel')"
        :to="classRoute('ReportsLessonReportPage', {})"
      />
      <HeaderTab
        :text="coreString('learnersLabel')"
        :to="classRoute('ReportsLessonLearnerListPage', {})"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import LessonOptionsDropdownMenu from '../plan/LessonSummaryPage/LessonOptionsDropdownMenu';
  import HeaderWithOptions from '../common/HeaderWithOptions';

  export default {
    name: 'ReportsLessonHeader',
    components: {
      HeaderWithOptions,
      LessonOptionsDropdownMenu,
    },
    mixins: [commonCoach, commonCoreStrings],
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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
