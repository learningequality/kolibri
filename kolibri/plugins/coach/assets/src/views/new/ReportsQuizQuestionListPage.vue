<template>

  <div class="new-coach-block">

    <ReportsQuizHeader />

    <h2>{{ $tr('overall') }}</h2>
    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ $tr('tableHeaderQuestion') }}</td>
          <td>{{ $tr('tableHeaderNeedHelp') }}</td>
          <td>{{ $tr('tableHeaderTimeSpent') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><KRouterLink text="Question 1" :to="questionLink" /></td>
          <td>
            <NeedHelp
              :count="12"
              :total="12"
              :showRatio="true"
              :verbosity="1"
          /></td>
          <td><TimeDuration :seconds="60*15" /></td>
        </tr>
        <tr>
          <td><KRouterLink text="Question 2" :to="questionLink" /></td>
          <td>
            <NeedHelp
              :count="1"
              :total="12"
              :showRatio="true"
              :verbosity="1"
          /></td>
          <td><TimeDuration :seconds="60*4" /></td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';
  import ReportsQuizHeader from './ReportsQuizHeader';

  export default {
    name: 'ReportsQuizQuestionListPage',
    components: {
      ReportsQuizHeader,
    },
    mixins: [imports],
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    computed: {
      questionLink() {
        return {
          name: 'NEW_COACH_PAGES',
          params: { page: 'ReportsQuizQuestionPage' },
        };
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {
      overall: 'Overall',
      tableHeaderQuestion: 'Question',
      tableHeaderNeedHelp: 'Help needed',
      tableHeaderTimeSpent: 'Average time spent',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
