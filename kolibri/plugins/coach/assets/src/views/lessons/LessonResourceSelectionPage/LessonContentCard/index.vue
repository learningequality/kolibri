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
      <!--
      <p class="ancestors">
        {{ $tr('topic') }} <KRouterLink text="TODO" :to="{}" />
        {{ $tr('channel') }} <KRouterLink text="TODO" :to="{}" />
      </p>
       -->
      <TextTruncator
        :text="description"
        :maxHeight="80"
        :showViewMore="true"
        class="description"
      />
      <CoachContentLabel
        class="coach-content-label"
        :value="numCoachContents"
        :isTopic="isTopic"
      />
      <p class="ancestors">
        <KRouterLink
          v-if="!isTopic"
          :text="$tr('previewButtonLabel')"
          :to="{}"
        />
      </p>
    </div>

  </router-link>

</template>


<script>

  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
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
      KRouterLink,
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
    $trs: {
      // These strings are not used yet
      resourcesInTopic: '{count} {count, plural, one {resource} other {resources}}',
      selectedResourcesInTopic: '{selected} of {total} selected',
      previewButtonLabel: 'View',
      topic: 'Topic:',
      channel: 'Channel:',
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
    margin-bottom: 24px;
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
    $left-offset: $thumb-width + $checkbox-offset;

    position: absolute;
    top: 0;
    bottom: 0;
    left: $left-offset;
    width: calc(100% - #{$left-offset});
    padding: 16px;
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
    font-size: 14px;
  }

  .ancestors {
    margin-top: 8px;
    font-size: smaller;
  }

  .message {
    position: absolute;
    top: 16px;
    right: 16px;
    color: $core-text-default;
  }

</style>
