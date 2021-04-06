<template>

  <router-link :to="link" class="content-card" :style="{ backgroundColor: $themeTokens.surface }">

    <CardThumbnail
      class="thumbnail"
      :thumbnail="thumbnail"
      :kind="kind"
      :isMobile="true"
    />

    <div class="text" :style="{ color: $themeTokens.text }">
      <h3
        class="title"
        :class="{ 'has-message': Boolean(message) }"
        dir="auto"
      >
        <KLabeledIcon :label="title">
          <template #icon>
            <ContentIcon :kind="kind" />
          </template>
        </KLabeledIcon>
      </h3>
      <div v-if="message" class="message" :style="{ color: $themeTokens.text }">
        {{ message }}
      </div>
      <TextTruncator
        :text="description"
        :maxHeight="80"
        class="description"
      />
      <div>
        <CoachContentLabel
          class="coach-content-label"
          :value="numCoachContents"
          :isTopic="isTopic"
        />
      </div>
    </div>

  </router-link>

</template>


<script>

  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import CardThumbnail from './CardThumbnail';

  export default {
    name: 'LessonContentCard',
    components: {
      CardThumbnail,
      ContentIcon,
      TextTruncator,
      CoachContentLabel,
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
        default: null,
      },
      kind: {
        type: String,
        required: true,
        validator: validateContentNodeKind,
      },
      isLeaf: {
        type: Boolean,
        required: true,
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
        return !this.isLeaf;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import './card';

  .content-card {
    @extend %dropshadow-2dp;

    position: relative;
    display: block;
    min-height: $thumb-height + 16;
    padding: 16px;
    margin-bottom: 24px;
    text-align: left;
    text-decoration: none;
    border-radius: 2px;
    transition: box-shadow $core-time ease;
    &:hover,
    &:focus {
      @extend %dropshadow-8dp;
    }
  }

  .thumbnail {
    position: absolute;
    top: 0;
    left: 0;
    margin: 8px;
  }

  .text {
    margin-left: $thumb-width + 8;
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
    margin-top: 0;
  }

  .message {
    position: absolute;
    top: 16px;
    right: 16px;
  }

  .coach-content-label {
    margin: 8px 0;
  }

</style>
