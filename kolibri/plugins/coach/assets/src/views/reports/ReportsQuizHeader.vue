<template>

  <KPageContainer style="padding-top:16px;">
    <BackLink
      :to="backlink"
      :text="backlinkLabel"
    />

    <!-- Cheating to get the same layout effect but not
         using a backlink...
    -->
    <BackLinkWithOptions>
      <div slot="backlink">
        <h1>
          <KLabeledIcon icon="quiz" :label="exam.title" />
        </h1>
        <StatusElapsedTime :date="examCreatedDate" actionType="created" />
      </div>
      <QuizOptionsDropdownMenu
        slot="options"
        optionsFor="report"
        @select="handleSelectOption"
      />
    </BackLinkWithOptions>

  </KPageContainer>

</template>


<script>

  import commonCoach from '../common';
  import QuizOptionsDropdownMenu from '../plan/QuizSummaryPage/QuizOptionsDropdownMenu';
  import BackLinkWithOptions from '../common/BackLinkWithOptions';

  export default {
    name: 'ReportsQuizHeader',
    components: {
      BackLinkWithOptions,
      QuizOptionsDropdownMenu,
    },
    mixins: [commonCoach],
    props: {
      backlink: {
        type: Object,
        required: true,
      },
      backlinkLabel: {
        type: String,
        required: true,
      },
    },
    computed: {
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      examCreatedDate() {
        if (this.exam.date_created) {
          return new Date(this.exam.date_created);
        } else {
          return null;
        }
      },
    },
    methods: {
      handleSelectOption(option) {
        if (option === 'EDIT_DETAILS') {
          this.$router.push(this.$router.getRoute('QuizReportEditDetailsPage'));
        }
        if (option === 'PREVIEW') {
          this.$router.push(this.$router.getRoute('ReportsQuizPreviewPage'));
        }
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

  h1 {
    margin-bottom: 0;
    font-size: 1.5rem;
  }

</style>
