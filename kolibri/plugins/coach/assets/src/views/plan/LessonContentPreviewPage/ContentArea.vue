<template>

  <section :style="{backgroundColor: isExercise ? $coreBgLight : ''}">
    <h2 v-if="isExercise" class="header">
      {{ header }}
    </h2>
    <ContentRenderer
      :id="content.id"
      :class="{ hof: isExercise}"
      :showCorrectAnswer="true"
      :itemId="selectedQuestion"
      :allowHints="false"
      :kind="content.kind"
      :files="content.files"
      :contentId="content.content_id"
      :channelId="content.channel_id"
      :available="content.available"
      :extraFields="content.extra_fields"
      :interactive="false"
    />
  </section>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';

  export default {
    name: 'ContentArea',
    components: {
      ContentRenderer,
    },
    mixins: [themeMixin],
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

</style>
