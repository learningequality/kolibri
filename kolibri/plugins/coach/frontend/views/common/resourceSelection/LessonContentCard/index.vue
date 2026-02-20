<template>

  <router-link
    :to="link"
    class="content-card"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <div
      :class="windowIsSmall ? 'mobile-text' : 'text'"
      :style="{ color: $themeTokens.text }"
    >
      <div
        :class="{ 'title-message-wrapper': Boolean(!windowIsSmall) }"
        :style="{ color: $themeTokens.text }"
      >
        <component
          :is="headingElement"
          class="title"
          dir="auto"
        >
          <KTextTruncator
            :text="content.title"
            :maxLines="2"
          />
        </component>
      </div>
      <KTextTruncator
        v-if="!windowIsSmall"
        :text="content.description"
        :maxLines="3"
        class="description"
        :style="{ color: $themeTokens.annotation }"
      />
      <div>
        <span
          v-if="message"
          class="message"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ message }}
        </span>
        <CoachContentLabel
          class="coach-content-label"
          :value="content.numCoachContents"
          :isTopic="isTopic"
        />
      </div>
      <slot name="notice"></slot>
      <LearningActivityChip
        v-if="content.is_leaf"
        :kind="content.learning_activities[0]"
        class="chip"
      />
    </div>
    <CardThumbnail
      v-if="!windowIsSmall"
      :isMobile="windowIsSmall"
      class="thumbnail"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
    />
  </router-link>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CoachContentLabel from 'kolibri-common/components/labels/CoachContentLabel';
  import { validateLinkObject } from 'kolibri/utils/validators';
  import LearningActivityChip from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityChip.vue';
  import CardThumbnail from './CardThumbnail';

  export default {
    name: 'LessonContentCard',
    components: {
      CardThumbnail,
      CoachContentLabel,
      LearningActivityChip,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    props: {
      content: {
        type: Object,
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
      message: {
        type: String,
        default: '',
      },
      headingLevel: {
        type: Number,
        default: 3,
        validator(value) {
          if (value <= 6 && value >= 2) {
            return true;
          } else {
            // eslint-disable-next-line no-console
            console.error(`'headingLevel' must be between 2 and 6.`);
            return false;
          }
        },
      },
    },
    computed: {
      isTopic() {
        return !this.content.isLeaf;
      },
      headingElement() {
        return `h${this.headingLevel}`;
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
    padding: 24px;
    margin-bottom: 24px;
    text-align: left;
    text-decoration: none;
    border-radius: 8px;
    transition: box-shadow $core-time ease;

    &:hover,
    &:focus {
      @extend %dropshadow-6dp;
    }
  }

  .thumbnail {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    border-radius: 0 8px 8px 0;
  }

  .text {
    flex-direction: column;
    max-width: calc(100% - #{$thumb-width} - 8px);
  }

  .title {
    margin-bottom: 0.5em;
    font-size: 1em;
  }

  .message {
    margin-bottom: 1.25em;
    font-size: 0.75em;
  }

  .description {
    margin-bottom: 0.5em;
    font-size: 0.875em;
  }

  .coach-content-label {
    width: 20%;
    margin: 0 8px;
  }

  .chip {
    padding: 0.5em;
    margin: 0.75em 0;
    font-size: 0.7em;
  }

  /deep/ .icon svg {
    width: 1.25em !important;
    height: 1.25em !important;
    padding-top: 1px;
  }

  /deep/ .mobile-thumbnail-wrapper {
    position: absolute;
    top: 0 !important;
    right: 0 !important;
    height: 125px;
  }

</style>
