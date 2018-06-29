<template>

  <router-link :to="link" class="content-card">

    <card-thumbnail
      class="thumbnail"
      :thumbnail="thumbnail"
      :kind="kind"
      :isMobile="true"
    />

    <div class="text">
      <h3
        class="title"
        :class="{'has-message': Boolean(message)}"
        dir="auto"
      >
        {{ title }}
      </h3>
      <div v-if="message" class="message">
        {{ message }}
      </div>

      <text-truncator
        :text="description"
        :maxHeight="40"
        :showViewMore="true"
        class="description"
      />
      <coach-content-label
        class="coach-content-label"
        :value="numCoachContents"
        :isTopic="isTopic"
      />
    </div>

  </router-link>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import textTruncator from 'kolibri.coreVue.components.textTruncator';
  import cardThumbnail from './card-thumbnail';

  export default {
    name: 'lessonContentCard',
    components: {
      cardThumbnail,
      textTruncator,
      coachContentLabel,
      kButton,
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      thumbnail: {
        type: String,
        required: false,
      },
      kind: {
        type: String,
        required: true,
        validator: validateContentNodeKind,
      },
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      // ContentNode.coach_content will be `0` if not a coach content leaf node,
      // or a topic without coach content. It will be a positive integer if a topic
      // with coach content, and `1` if a coach content leaf node.
      numCoachContents: {
        type: Number,
        default: 0,
      },
      message: {
        type: String,
        default: '',
      },
    },
    computed: {
      isTopic() {
        return this.kind === ContentNodeKinds.CHANNEL || this.kind === ContentNodeKinds.TOPIC;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require './card.styl'

  .coach-content-label
    padding: 8px 0

  .content-card
    text-decoration: none
    display: block
    border-radius: 2px
    background-color: $core-bg-light
    height: $thumb-height
    margin-bottom: 16px
    text-align: left
    display: relative

    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14),
                0 3px 1px -2px rgba(0, 0, 0, 0.2),
                0 1px 5px 0 rgba(0, 0, 0, 0.12)
    transition: box-shadow 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)
    &:hover, &:focus
      box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
                  0 3px 14px 2px rgba(0, 0, 0, 0.12),
                  0 5px 5px -3px rgba(0, 0, 0, 0.2)

  .text
    color: $core-text-default
    position: absolute
    top: 0
    bottom: 0
    left: $thumb-width
    width: 'calc(100% - %s)' % $thumb-width // stylus exlusive
    padding: 24px
    overflow-y: auto

  .title, .description
    margin: 0

  .title, .message
    overflow: hidden
    text-overflow: ellipsis
    white-space: nowrap

  .title.has-message, .message
    max-width: 45%

  .title
    font-size: 16px
    padding-bottom: 8px

  .description
    font-size: 12px

  .message
    color: $core-text-default
    position: absolute
    top: 24px
    right: 24px

</style>
