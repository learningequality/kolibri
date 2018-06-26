<template>

  <section :class="{padding: isPerseusExercise}">
    <h2 v-if="isPerseusExercise" class="header">
      {{ header }}
    </h2>
    <content-renderer
      :class="{ hof: isPerseusExercise}"
      :showCorrectAnswer="true"
      :id="content.pk"
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

  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';

  export default {
    name: 'contentArea',
    components: {
      contentRenderer,
    },
    props: {
      content: {
        type: Object,
        required: true,
      },
      // Perseus-specific
      selectedQuestion: {
        type: String,
        required: false,
      },
      isPerseusExercise: {
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
    computed: {
      hasHeader() {
        return Boolean(this.header);
      },
    },
  };

</script>


<style scoped lang="stylus">

  .padding
    padding-left: 8px // give same margin as question-list (16px)

  .hof
    overflow-x: hidden // .solutionarea's negative margin oversteps

  .header
    margin: 0
    margin-left: $perseus-padding
    line-height: $header-height
    vertical-align: middle
    font-size: 16px // same as question-list

</style>
