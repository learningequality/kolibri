<template>

  <section
    class="content-area"
    :class="{perseus: isPerseusExercise}"
  >
    <h2 v-if="isPerseusExercise" class="header">
      {{ header }}
    </h2>
    <content-renderer
      class="content"
      :class="{perseus: isPerseusExercise}"
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

  $perseus-padding = 15px
  $header-height = 56px // dupe from question-list

  .content-area
    padding: 0
    &.perseus
      padding-left: 1px // give same margin as question-list (16px)

  .content
    // NOTE stylus exclusive. Variable/calc interpolation
    width: 100%
    height: 100%
    overflow-y: auto

    // overwrite pdf display render styles
    max-height: 100%
    margin-left: 0
    margin-right: 0

    &.perseus
      max-height: 'calc(100% - %s)' % $header-height
      overflow-x: hidden // .solutionarea's negative margin oversteps

  .header
    margin: 0
    margin-left: $perseus-padding
    line-height: $header-height
    vertical-align: middle
    font-size: 16px // same as question-list

</style>
