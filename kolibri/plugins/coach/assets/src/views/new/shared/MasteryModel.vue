<template>

  <span>{{ text }}</span>

</template>


<script>

  // from le-utils/le_utils/constants/exercises.py
  const DO_ALL = 'do_all';
  const NUM_CORRECT_IN_A_ROW_10 = 'num_correct_in_a_row_10';
  const NUM_CORRECT_IN_A_ROW_2 = 'num_correct_in_a_row_2';
  const NUM_CORRECT_IN_A_ROW_3 = 'num_correct_in_a_row_3';
  const NUM_CORRECT_IN_A_ROW_5 = 'num_correct_in_a_row_5';
  const M_OF_N = 'm_of_n';

  const models = [
    DO_ALL,
    NUM_CORRECT_IN_A_ROW_10,
    NUM_CORRECT_IN_A_ROW_2,
    NUM_CORRECT_IN_A_ROW_3,
    NUM_CORRECT_IN_A_ROW_5,
    M_OF_N,
  ];

  export default {
    name: 'MasteryModel',
    components: {},
    props: {
      model: {
        type: String,
        default: M_OF_N,
        validator(value) {
          return models.includes(value);
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
        if (this.model === M_OF_N) {
          if (this.m === this.n) {
            if (this.m === 1) {
              return this.$tr('one');
            }
            return this.$tr('streak', { m: this.m });
          }
          return this.$tr('mOfN', { M: this.m, N: this.n });
        } else if (this.model === NUM_CORRECT_IN_A_ROW_10) {
          return this.$tr('streak', { count: 10 });
        } else if (this.model === NUM_CORRECT_IN_A_ROW_2) {
          return this.$tr('streak', { count: 2 });
        } else if (this.model === NUM_CORRECT_IN_A_ROW_3) {
          return this.$tr('streak', { count: 3 });
        } else if (this.model === NUM_CORRECT_IN_A_ROW_5) {
          return this.$tr('streak', { count: 5 });
        } else if (this.model === DO_ALL) {
          return this.$tr('doAll');
        } else {
          return this.$tr('unknown');
        }
      },
    },
    $trs: {
      one: 'Get one question correct',
      streak: 'Get {count, number, integer} questions in a row correct',
      mOfN: 'Get {M, number, integer} of the last {N, number, integer} questions correct',
      doAll: 'Get every question correct',
      unknown: 'Unknown mastery model',
    },
  };

</script>


<style lang="scss" scoped></style>
