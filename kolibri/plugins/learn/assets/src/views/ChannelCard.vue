<template>

  <router-link
    :to="link"
    class="card-main-wrapper"
    :style="cardStyle"
    :class="$computedClass({ ':focus': $coreOutline })"
  >

    <h3
      class="title"
      dir="auto"
      :style="{ borderBottom: `1px solid ${$themeTokens.fineLine}` }"
    >
      <TextTruncator
        :text="title"
        :maxHeight="titleHeight"
        :showTooltip="true"
      />
    </h3>

    <KFixedGrid
      numCols="4"
      gutter="16"
      style="margin: 0 16px;"
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
        <TextTruncator
          :text="tagline"
          :maxHeight="taglineHeight"
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

  </router-link>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import ChannelThumbnail from './ChannelThumbnail';

  export default {
    name: 'ChannelCard',
    components: {
      ChannelThumbnail,
      CoachContentLabel,
      TextTruncator,
    },
    mixins: [responsiveWindowMixin],
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
        type: String,
        required: false,
        default: null,
      },
    },
    computed: {
      ...mapGetters(['isLearner', 'isUserLoggedIn']),
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
      titleHeight() {
        return 60;
      },
      taglineHeight() {
        return 155;
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
      @extend %dropshadow-8dp;
    }

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
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

</style>
