<template>

  <span>{{ text }}</span>

</template>


<script>

  import { MasteryModelTypes } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'MasteryModel',
    props: {
      model: {
        type: String,
        default: MasteryModelTypes.m_of_n,
        validator(value) {
          return Object.values(MasteryModelTypes).includes(value);
        },
      },
      m: {
        type: Number,
        default: 1,
      },
      n: {
        type: Number,
        default: 1,
      },
    },
    computed: {
      text() {
        if (this.model === MasteryModelTypes.m_of_n) {
          if (this.m === this.n) {
            if (this.m === 1) {
              return this.$tr('one');
            }
            return this.$tr('streak', { m: this.m });
          }
          return this.$tr('mOfN', { M: this.m, N: this.n });
        } else if (this.model === MasteryModelTypes.num_correct_in_a_row_10) {
          return this.$tr('streak', { count: 10 });
        } else if (this.model === MasteryModelTypes.num_correct_in_a_row_2) {
          return this.$tr('streak', { count: 2 });
        } else if (this.model === MasteryModelTypes.num_correct_in_a_row_3) {
          return this.$tr('streak', { count: 3 });
        } else if (this.model === MasteryModelTypes.num_correct_in_a_row_5) {
          return this.$tr('streak', { count: 5 });
        } else if (this.model === MasteryModelTypes.do_all) {
          return this.$tr('doAll');
        } else {
          return this.$tr('unknown');
        }
      },
    },
    $trs: {
      one: 'Get one question correct',
      // TODO add pluralized versions of 'streak', and 'mofN'
      streak: 'Get {count, number, integer} questions in a row correct',
      mOfN: 'Get {M, number, integer} of the last {N, number, integer} questions correct',
      doAll: 'Get every question correct',
      unknown: 'Unknown mastery model',
    },
  };

</script>


<style lang="scss" scoped></style>
