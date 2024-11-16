<template>

  <router-link
    :to="link"
    class="card-main-wrapper"
    :style="cardStyle"
    :class="$computedClass({ ':focus': $coreOutline })"
  >
    <div
      v-if="explore"
      class="explore"
    >
      <h1>
        {{ title }}
      </h1>
    </div>
    <div v-else>
      <h3
        class="title"
        dir="auto"
        :style="{ borderBottom: `1px solid ${$themeTokens.fineLine}` }"
      >
        <KTextTruncator
          :text="title"
          :maxLines="2"
          :showTooltip="true"
        />
      </h3>

      <KFixedGrid
        numCols="4"
        gutter="16"
        style="margin: 0 16px"
      >
        <KFixedGridItem span="1">
          <ChannelThumbnail
            class="thumbnail"
            v-bind="{ thumbnail, isMobile }"
          />
        </KFixedGridItem>
        <KFixedGridItem
          span="3"
          alignment="auto"
        >
          <KTextTruncator
            :text="tagline"
            :maxLines="4"
            :showTooltip="false"
          />
        </KFixedGridItem>
      </KFixedGrid>

      <CoachContentLabel
        v-if="isUserLoggedIn && !isLearner"
        class="coach-content-label"
        :value="numCoachContents"
        :isTopic="true"
      />

      <div
        v-if="version"
        class="version-wrapper"
        :style="versionStyle"
      >
        <p>{{ $tr('version', { version: version }) }}</p>
      </div>
      <div
        v-if="isRemote"
        class="wifi-icon"
      >
        <KIcon icon="wifi" />
      </div>
    </div>
  </router-link>

</template>


<script>

  import { validateLinkObject } from 'kolibri/utils/validators';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CoachContentLabel from 'kolibri-common/components/labels/CoachContentLabel';
  import useUser from 'kolibri/composables/useUser';
  import ChannelThumbnail from './ChannelThumbnail';

  export default {
    name: 'ChannelCard',
    components: {
      ChannelThumbnail,
      CoachContentLabel,
    },
    setup() {
      const { windowGutter } = useKResponsiveWindow();
      const { isUserLoggedIn, isLearner } = useUser();
      return {
        windowGutter,
        isUserLoggedIn,
        isLearner,
      };
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      tagline: {
        type: String,
        default: null,
      },
      thumbnail: {
        type: String,
        default: null,
      },
      // ContentNode.coach_content will be `0` if not a coach content leaf node,
      // or a topic without coach content. It will be a positive integer if a topic
      // with coach content, and `1` if a coach content leaf node.
      numCoachContents: {
        type: Number,
        default: 0,
      },
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      isMobile: {
        type: Boolean,
        default: false,
      },
      version: {
        type: Number,
        required: false,
        default: null,
      },
      isRemote: {
        type: Boolean,
        required: false,
        default: false,
      },
      explore: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    computed: {
      overallHeight() {
        return 270;
      },
      cardStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
          color: this.$themeTokens.text,
          marginBottom: `${this.windowGutter}px`,
          minHeight: `${this.overallHeight}px`,
        };
      },
      versionStyle() {
        return {
          color: this.$themeTokens.annotation,
        };
      },
    },
    $trs: {
      version: {
        message: 'Version {version, number, integer}',
        context:
          'Indicates the channel version. This can be updated when new resources are made available in a channel.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  $margin: 16px;

  .coach-content-label {
    position: absolute;
    bottom: $margin;
    left: $margin;
    display: inline-block;
  }

  .card-main-wrapper {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-block;
    width: 100%;
    max-height: 270px;
    padding-bottom: $margin;
    text-decoration: none;
    vertical-align: top;
    border-radius: $radius;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-6dp;
    }

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .explore {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 270px;
    text-align: center;

    h1 {
      padding: 0;
      margin: 0 20px;
    }
  }

  .title {
    padding: 0 48px $margin $margin;
  }

  .progress-icon {
    position: absolute;
    top: 12px;
    right: $margin;
  }

  /deep/.card-thumbnail-wrapper {
    max-width: 100%;
  }

  .version-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;

    p {
      padding: $margin;
      margin-bottom: 0;
    }
  }

  .wifi-icon {
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 20px;
    margin: 0;
  }

</style>
