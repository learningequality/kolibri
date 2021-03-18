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
      {{ title }}
    </h3>


    <ProgressIcon
      v-if="progress > 0"
      class="progress-icon"
      :progress="progress"
    />


    <KFixedGrid numCols="4" gutter="16" style="margin: 0 16px;">
      <KFixedGridItem span="1">
        <CardThumbnail
          class="thumbnail"
          v-bind="{ thumbnail, kind, isMobile }"
          :showTooltip="false"
          :showContentIcon="false"
        />
      </KFixedGridItem>
      <KFixedGridItem span="3">
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

  </router-link>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import CardThumbnail from './ContentCard/CardThumbnail';

  export default {
    name: 'ChannelCard',
    components: {
      CardThumbnail,
      CoachContentLabel,
      TextTruncator,
      ProgressIcon,
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
      kind: {
        type: String,
        required: true,
        validator: validateContentNodeKind,
      },
      // ContentNode.coach_content will be `0` if not a coach content leaf node,
      // or a topic without coach content. It will be a positive integer if a topic
      // with coach content, and `1` if a coach content leaf node.
      numCoachContents: {
        type: Number,
        default: 0,
      },
      progress: {
        type: Number,
        required: false,
        default: 0.0,
        validator(value) {
          return value >= 0.0 && value <= 1.0;
        },
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
    },
    computed: {
      ...mapGetters(['isLearner', 'isUserLoggedIn']),
      overallHeight() {
        return 258;
      },
      cardStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
          color: this.$themeTokens.text,
          marginBottom: `${this.windowGutter}px`,
          minHeight: `${this.overallHeight}px`,
        };
      },
      taglineHeight() {
        return 165;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import './ContentCard/card';

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
    border-bottom: 2px solid #cecece;
  }

  .progress-icon {
    position: absolute;
    top: 12px;
    right: $margin;
  }

  /deep/.card-thumbnail-wrapper {
    max-width: 100%;
  }

</style>
