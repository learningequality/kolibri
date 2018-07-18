<template>

  <router-link :to="link" class="content-card">

    <CardThumbnail
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

      <TextTruncator
        :text="description"
        :maxHeight="40"
        :showViewMore="true"
        class="description"
      />
      <CoachContentLabel
        class="coach-content-label"
        :value="numCoachContents"
        :isTopic="isTopic"
      />
    </div>

  </router-link>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import CardThumbnail from './CardThumbnail';

  export default {
    name: 'LessonContentCard',
    components: {
      CardThumbnail,
      TextTruncator,
      CoachContentLabel,
      KButton,
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


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import './card';

  .coach-content-label {
    padding: 8px 0;
  }

  .content-card {
    display: block;
    height: $thumb-height;
    margin-bottom: 16px;
    text-align: left;
    text-decoration: none;
    background-color: $core-bg-light;
    border-radius: 2px;
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2),
      0 1px 5px 0 rgba(0, 0, 0, 0.12);
    transition: box-shadow $core-time ease;
    &:hover,
    &:focus {
      box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12),
        0 5px 5px -3px rgba(0, 0, 0, 0.2);
    }
  }

  .text {
    position: absolute;
    top: 0;
    bottom: 0;
    left: $thumb-width;
    width: calc(100% - #{$thumb-width});
    padding: 24px;
    overflow-y: auto;
    color: $core-text-default;
  }

  .title,
  .description {
    margin: 0;
  }

  .title,
  .message {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title.has-message,
  .message {
    max-width: 45%;
  }

  .title {
    padding-bottom: 8px;
    font-size: 16px;
  }

  .description {
    font-size: 12px;
  }

  .message {
    position: absolute;
    top: 24px;
    right: 24px;
    color: $core-text-default;
  }

</style>
