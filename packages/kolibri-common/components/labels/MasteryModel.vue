<template>

  <span>{{ text }}</span>

</template>


<script>

  import { MasteryModelTypes } from 'kolibri.coreVue.vuex.constants';
  import { masteryModelValidator } from 'kolibri-common/utils/contentNode';

  export default {
    name: 'MasteryModel',
    props: {
      masteryModel: {
        type: Object,
        default: null,
        validator: masteryModelValidator,
      },
    },
    computed: {
      text() {
        if (!this.masteryModel) {
          return '';
        }
        const { type, m, n } = this.masteryModel;
        if (type === MasteryModelTypes.m_of_n) {
          if (m === n) {
            if (m === 1) {
              return this.$tr('one');
            }
            return this.$tr('streak', { count: m });
          }
          return this.$tr('mOfN', { M: m, N: n });
        } else if (type === MasteryModelTypes.num_correct_in_a_row_10) {
          return this.$tr('streak', { count: 10 });
        } else if (type === MasteryModelTypes.num_correct_in_a_row_2) {
          return this.$tr('streak', { count: 2 });
        } else if (type === MasteryModelTypes.num_correct_in_a_row_3) {
          return this.$tr('streak', { count: 3 });
        } else if (type === MasteryModelTypes.num_correct_in_a_row_5) {
          return this.$tr('streak', { count: 5 });
        } else if (type === MasteryModelTypes.do_all) {
          return this.$tr('doAll');
        } else {
          return this.$tr('unknown');
        }
      },
    },
    $trs: {
      one: {
        message: 'Get one question correct',
        context:
          'In order for exercises to be considered completed or "mastered", learners must complete the required number of correct answers.\n\nIn this option the learner must get just one question correct.',
      },
      // TODO(i18n) add pluralized versions of 'streak', and 'mofN'
      streak: {
        message: 'Get {count, number, integer} questions in a row correct',
        context:
          'In order for exercises to be considered completed or "mastered", learners must complete the required number of correct answers.\n\nIn this option the learner must get a specific number of questions correct in a row.',
      },
      mOfN: {
        message: 'Get {M, number, integer} of the last {N, number, integer} questions correct',
        context:
          'In order for exercises to be considered completed or "mastered", learners must complete the required number of correct answers.\n\nIn this option the learner must get a specific number of questions correct from the last set of questions.',
      },
      doAll: {
        message: 'Get every question correct',
        context:
          'In order for exercises to be considered completed or "mastered", learners must complete the required number of correct answers.\n\nIn this option the learner must get all questions correct.',
      },
      unknown: {
        message: 'Unknown mastery model',
        context:
          "Mastery model refers to the 'number of correct answers that need to be given by learners' for an exercise to be considered \"mastered\". This particular one (unknown) tries to cover for cases when the mastery is not clearly defined as 'answered X of Y questions'.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
