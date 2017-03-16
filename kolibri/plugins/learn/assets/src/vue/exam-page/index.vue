<template>

  <div>
    <page-header :title="examTitle">
    </page-header>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'examPage',
    $trs: {
      submitExam: 'Submit exam',
      backToExamList: 'Back to exam list',
      questionsAnswered: '{numRemain, number} of {numTotal, number}' +
        '{numTotal, plural, one {question} other {questions}} remaining',
    },
    vuex: {
      getters: {
        examTitle: state => state.pageState.examTitle,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
