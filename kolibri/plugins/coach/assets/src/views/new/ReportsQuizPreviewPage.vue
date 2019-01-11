<template>

  <div>
    <p>
      <BackLink
        text="Some Quiz"
        :to="newCoachRoute('ReportsQuizLearnerListPage')"
      />
    </p>
    <p>
      <BackLink
        :text="$tr('backToQuizAction')"
        :to="newCoachRoute('ReportsQuizLearnerListPage')"
      />
    </p>
    <h1>{{ coachStrings.$tr('previewLabel') }}</h1>
    <h1>Some quiz</h1>
    <p>{{ coachStrings.$tr('orderFixedDescription') }}</p>
    <p>{{ coachStrings.$tr('orderRandomDescription') }}</p>
    <p>{{ coachStrings.$tr('numberOfQuestions', {value: 2}) }}</p>
  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsQuizPreviewPage',
    components: {},
    mixins: [imports],
    $trs: {
      backToQuizAction: 'Back to quiz',
    },
  };

</script>


<style lang="scss" scoped></style>
