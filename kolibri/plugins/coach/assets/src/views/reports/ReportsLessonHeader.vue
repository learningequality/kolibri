<template>

  <div>
    <BackLinkWithOptions>
      <BackLink
        slot="backlink"
        :to="classRoute('ReportsLessonListPage')"
        :text="$tr('back')"
      />
      <LessonOptionsDropdownMenu
        slot="options"
        optionsFor="report"
        @select="handleSelectOption"
      />
    </BackLinkWithOptions>

    <h1>
      <KLabeledIcon icon="lesson" :label="lesson.title" />
    </h1>

    <HeaderTable>
      <HeaderTableRow :keyText="coachCommon$tr('statusLabel')">
        <LessonActive
          slot="value"
          :active="lesson.active"
        />
      </HeaderTableRow>
      <HeaderTableRow :keyText="coachCommon$tr('recipientsLabel')">
        <Recipients
          slot="value"
          :groupNames="getGroupNames(lesson.groups)"
          :hasAssignments="lesson.assignments.length > 0"
        />
      </HeaderTableRow>
      <HeaderTableRow
        :keyText="coachCommon$tr('descriptionLabel')"
        :valueText="lesson.description || coachCommon$tr('descriptionMissingLabel')"
      />
    </HeaderTable>

    <HeaderTabs>

      <HeaderTab
        :text="coachCommon$tr('reportLabel')"
        :to="classRoute('ReportsLessonReportPage', {})"
      />
      <HeaderTab
        :text="coreCommon$tr('learnersLabel')"
        :to="classRoute('ReportsLessonLearnerListPage', {})"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoach from '../common';
  import LessonOptionsDropdownMenu from '../plan/LessonSummaryPage/LessonOptionsDropdownMenu';
  import BackLinkWithOptions from '../common/BackLinkWithOptions';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';

  export default {
    name: 'ReportsLessonHeader',
    components: {
      BackLinkWithOptions,
      LessonOptionsDropdownMenu,
    },
    mixins: [commonCoach, coreStringsMixin],
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
    },
  };

</script>


<style lang="scss" scoped></style>
