<template>

  <span>{{ text }}</span>

</template>


<script>

  import { MasteryModelTypes } from 'kolibri.coreVue.vuex.constants';

  function masteryModelValidator({ type, m, n }) {
    let isValid = true;
    const typeIsValid = Object.values(MasteryModelTypes).includes(type);
    if (!typeIsValid) {
      // eslint-disable-next-line no-console
      console.error(`Invalid mastery model type: ${type}`);
      isValid = false;
    }
    if (type === MasteryModelTypes.m_of_n) {
      if (typeof n !== 'number' || typeof m !== 'number') {
        // eslint-disable-next-line no-console
        console.error(`Invalid value of m and/or n. m: ${m}, n: ${n}`);
        isValid = false;
      }
    }
    return isValid;
  }

  export default {
    name: 'MasteryModel',
    props: {
      masteryModel: {
        type: Object,
        required: false,
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
      one: 'Get one question correct',
      // TODO(i18n) add pluralized versions of 'streak', and 'mofN'
      streak: 'Get {count, number, integer} questions in a row correct',
      mOfN: 'Get {M, number, integer} of the last {N, number, integer} questions correct',
      doAll: 'Get every question correct',
      unknown: 'Unknown mastery model',
    },
  };

</script>


<style lang="scss" scoped></style>
