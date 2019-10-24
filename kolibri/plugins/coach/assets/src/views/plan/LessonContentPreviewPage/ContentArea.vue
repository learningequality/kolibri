<template>

  <section :style="{backgroundColor: isExercise ? $themeTokens.surface : ''}">
    <h2 v-if="isExercise" class="header">
      {{ header }}
    </h2>
    <KContentRenderer
      :class="{ hof: isExercise}"
      :showCorrectAnswer="true"
      :itemId="selectedQuestion"
      :allowHints="false"
      :kind="content.kind"
      :files="content.files"
      :available="content.available"
      :extraFields="content.extra_fields"
      :interactive="false"
    />
  </section>

</template>


<script>

  export default {
    name: 'ContentArea',
    props: {
      content: {
        type: Object,
        required: true,
      },
      // Exercise-specific
      selectedQuestion: {
        type: String,
        required: false,
      },
      isExercise: {
        type: Boolean,
        required: false,
        default: false,
      },
      header: {
        type: String,
        required: false,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content-area-exercise {
    padding: 16px;
  }

  .hof {
    overflow-x: hidden; // .solutionarea's negative margin oversteps
  }

  .header {
    margin: 0;
    font-size: 16px; // same as question-list
  }

  // Centers the video inside the main slot
  /deep/ .wrapper {
    margin: auto;
  }

</style>
