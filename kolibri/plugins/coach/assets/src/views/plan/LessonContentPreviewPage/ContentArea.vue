<template>

  <section :style="{ backgroundColor: isExercise ? $themeTokens.surface : '' }">
    <h2 v-if="isExercise" class="header">
      {{ header }}
    </h2>
    <ContentRenderer
      v-if="content.available"
      :class="{ hof: isExercise }"
      :showCorrectAnswer="true"
      :itemId="selectedQuestion"
      :allowHints="false"
      :kind="content.kind"
      :files="content.files"
      :available="content.available"
      :extraFields="content.extra_fields"
      :interactive="false"
    />
    <MissingResourceAlert v-else :multiple="false" />
  </section>

</template>


<script>

  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert';

  export default {
    name: 'ContentArea',
    components: {
      MissingResourceAlert,
    },
    props: {
      content: {
        type: Object,
        required: true,
      },
      // Exercise-specific
      selectedQuestion: {
        type: String,
        default: null,
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
