<template>

  <KPageContainer style="padding-top: 24px">
    <BackLink
      :to="backlink"
      :text="backlinkLabel"
    />

    <!-- Cheating to get the same layout effect but not
           using a backlink...
      -->
    <div class="header">
      <div>
        <h1 class="exam-title">
          <!-- KLabeledIcon does not have an 'exam' token, but rather 'quiz' -->
          <KLabeledIcon
            :icon="examOrLesson === 'exam' ? 'quiz' : 'lesson'"
            :label="resource.title"
          />
        </h1>
      </div>
      <div
        v-if="!$isPrint"
        class="options"
      >
        <slot name="dropdown"></slot>
      </div>
    </div>
    <MissingResourceAlert v-if="resource.missing_resource" />
  </KPageContainer>

</template>


<script>

  import { mapState } from 'vuex';
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert';
  import BackLink from './BackLink';

  export default {
    name: 'QuizLessonDetailsHeader',
    components: {
      MissingResourceAlert,
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
      examOrLesson: {
        type: String,
        required: true,
        validator(value) {
          return ['exam', 'lesson'].includes(value);
        },
      },
    },
    computed: {
      ...mapState('classSummary', ['examMap', 'lessonMap']),
      exam() {
        return this.examMap[this.$route.params.quizId] || {};
      },
      lesson() {
        return this.lessonMap[this.$route.params.lessonId] || {};
      },
      resource() {
        return this.examOrLesson === 'lesson' ? this.lesson : this.exam;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .exam-title {
    margin-top: 0;
    margin-bottom: 0;
  }

  .header {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
  }

  .options {
    flex-shrink: 0;
  }

  /deep/ .time-context {
    margin-bottom: 0;
  }

</style>
