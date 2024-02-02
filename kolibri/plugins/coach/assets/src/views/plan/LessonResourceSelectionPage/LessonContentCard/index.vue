<template>

  <router-link :to="link" class="content-card" :style="{ backgroundColor: $themeTokens.surface }">

    <div>
      <CardThumbnail
        class="thumbnail"
        :thumbnail="thumbnail"
        :kind="kind"
        :isMobile="windowIsSmall"
      />
  
      <div :class="windowIsSmall ? 'mobile-text' : 'text'" :style="{ color: $themeTokens.text }">
        <div
          :class="{ 'title-message-wrapper': Boolean(!windowIsSmall) }"
          :style="{ color: $themeTokens.text }"
        >
          <h3
            v-if="!windowIsSmall"
            class="title"
            dir="auto"
          >
            <KLabeledIcon :label="title">
              <template #icon>
                <ContentIcon :kind="kind" />
              </template>
            </KLabeledIcon>
          </h3>
          <h3
            v-if="windowIsSmall"
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
        </div>
        <TextTruncatorCss
          v-if="!windowIsSmall"
          :text="description"
          :maxLines="3"
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
    </div>
    <br>
    <div class="background-color:grey;border-radius:0.5em;height:50px">
      Folder exceeds 12 exercises
    </div>
  </router-link>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/useKResponsiveWindow';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import TextTruncatorCss from 'kolibri.coreVue.components.TextTruncatorCss';
  import CardThumbnail from './CardThumbnail';

  export default {
    name: 'LessonContentCard',
    components: {
      CardThumbnail,
      ContentIcon,
      TextTruncatorCss,
      CoachContentLabel,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
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
    flex-direction: column;
    margin-left: $thumb-width + 8;
  }

  .mobile-text {
    margin-left: $mobile-thumb-width + 8;
  }

  .title-message-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .title,
  .message {
    margin-top: 0;
    overflow: hidden;
  }

  .message {
    text-align: right;
  }

  .coach-content-label {
    margin: 8px 0;
  }

</style>
