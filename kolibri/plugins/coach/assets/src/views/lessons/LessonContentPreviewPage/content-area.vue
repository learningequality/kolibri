<template>

  <section :class="['content-area', isPerseusExercise || 'perseus']">
    <h2 v-if="header" class="header">
      {{ header }}
    </h2>
    <content-renderer
      class="content"
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
      :assessment="true"
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
  };

</script>


<style lang="stylus">

  $perseus-padding = 15px

  .content-area
    padding: 0
    &.perseus
      padding-left: 1px // give same margin as question-list (16px)

  // duping from question-list
  .header
    margin: 0
    margin-left: $perseus-padding
    line-height: 56px
    vertical-align: middle
    font-size: 16px // same as question-list

</style>
