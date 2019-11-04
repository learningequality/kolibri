<template>

  <KPageContainer style="padding-top: 16px;">
    <BackLink
      :to="backlink"
      :text="backlinkLabel"
    />

    <!-- Cheating to get the same layout effect but not
         using a backlink...
    -->
    <BackLinkWithOptions>
      <div slot="backlink">
        <h1 class="exam-title">
          <KLabeledIcon icon="quiz" :label="exam.title" />
        </h1>
        <StatusElapsedTime :date="examCreatedDate" actionType="created" />
      </div>
      <div slot="options">
        <slot name="dropdown"></slot>
      </div>
    </BackLinkWithOptions>

  </KPageContainer>

</template>


<script>

  import { mapState } from 'vuex';
  import BackLinkWithOptions from './BackLinkWithOptions';
  import StatusElapsedTime from './StatusElapsedTime';
  import BackLink from './BackLink';

  export default {
    name: 'QuizHeader',
    components: {
      BackLinkWithOptions,
      StatusElapsedTime,
      BackLink,
    },
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
      ...mapState('classSummary', ['examMap']),
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
  };

</script>


<style lang="scss" scoped>

  .exam-title {
    margin-bottom: 0;
    font-size: 1.5rem;
  }

</style>
