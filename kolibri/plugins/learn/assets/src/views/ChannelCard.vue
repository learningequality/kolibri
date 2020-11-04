<template>

  <router-link
    :to="link"
    class="card-main-wrapper"
    :style="cardStyle"
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
      :isTopic="isTopic"
    />

    <ol
      v-if="breadcrumbs.length > 0"
      class="shortcut-breadcrumbs"
      :style="{ borderTop: `1px solid ${$themeTokens.fineLine}` }"
    >
      <template v-for="(breadcrumb, index) in breadcrumbs">
        <li>{{ breadcrumb.text }}</li>
      </template>
    </ol>

  </router-link>

</template>


<script>
  import { mapGetters } from 'vuex';
  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
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
        required: false,
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
      breadcrumbs: {
        type: Array,
        required: false,
        default: [],
      }
    },
    computed: {
      ...mapGetters(['isLearner', 'isUserLoggedIn']),
      isTopic() {
        return this.kind === ContentNodeKinds.TOPIC || this.kind === ContentNodeKinds.CHANNEL;
      },
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

  .shortcut-breadcrumbs {
    display: block;
    list-style: none;
    margin: 16px 0 0 0;
    padding: 12px 16px 0 16px;
    font-size: 0.9rem;
  }

  .shortcut-breadcrumbs li {
    display: inline-block;
    color: rgb(97, 97, 97);
  }

  .shortcut-breadcrumbs li::after {
    content: "\203A";
    margin-left: 8px;
    margin-right: 8px;
  }

  .shortcut-breadcrumbs li:last-child::after {
    content: none;
  }

</style>
