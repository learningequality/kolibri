<template>

  <router-link
    :to="link"
    class="card"
    :style="{ backgroundColor: $themeTokens.surface, color: $themeTokens.text }"
  >

    <KGrid :gridStyle="{ marginLeft: 0, marginRight: 0 }">

      <KGridItem
        class="card-heading"
        :style="{ borderBottom: `1px solid ${$themeTokens.fineLine}` }"
        :layout4="{ span: 4 }"
        :layout8="{ span: 8 }"
        :layout12="{ span: 12 }"
      >
        <h3 class="title" dir="auto">
          <TextTruncator
            :text="title"
            :maxHeight="50"
          />
        </h3>
      </KGridItem>

      <div class="card-content">
        <KGridItem
          :layout4="{ span: 1 }"
          :layout8="{ span: 2 }"
          :layout12="{ span: 3 }"
        >
          <CardThumbnail
            class="thumbnail"
            v-bind="{ thumbnail, progress, kind, isMobile, showContentIcon }"
            :showTooltip="false"
            :showContentIcon="false"
          />
        </KGridItem>

        <KGridItem
          :layout4="{ span: 3 }"
          :layout8="{ span: 6 }"
          :layout12="{ span: 9 }"
        >
          <TextTruncator
            v-if="tagline"
            class="text"
            :text="tagline"
            :maxHeight="150"
            :showTooltip="false"
          />
        </KGridItem>
      </div>

      <KGridItem
        class="card-footer"
        :layout4="{ span: 4 }"
        :layout8="{ span: 8 }"
        :layout12="{ span: 12 }"
      >
        <CoachContentLabel
          v-if="isUserLoggedIn && !isLearner"
          class="coach-content-label"
          :value="numCoachContents"
          :isTopic="isTopic"
        />
      </KGridItem>

    </KGrid>

  </router-link>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import CardThumbnail from './ContentCard/CardThumbnail';

  export default {
    name: 'ChannelCard',
    components: {
      CardThumbnail,
      CoachContentLabel,
      TextTruncator,
    },
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
      showContentIcon: {
        type: Boolean,
        default: true,
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
      isTopic() {
        return this.kind === ContentNodeKinds.TOPIC || this.kind === ContentNodeKinds.CHANNEL;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import './ContentCard/card';

  $margin: 16px;

  .coach-content-label {
    display: inline-block;
  }

  .card {
    @extend %dropshadow-1dp;

    display: inline-block;
    width: 100%;
    min-height: 222px; // Defined in Figma
    margin-bottom: 24px;
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

  .card-heading {
    padding: 0 $margin !important;
    border-bottom: 2px solid #cecece;
  }

  .card-content {
    width: 100%;
    // Height set to ensure consistent text height
    // calculated from 150
    height: 172px;
    padding: $margin;
  }

  .thumbnail {
    position: relative;
    display: inline-block;
  }

  .text {
    position: relative;
    display: inline-block;
    padding: 0 0 0 $margin;
    margin: 0;
    vertical-align: top;
  }

  .card-footer {
    display: block;
    width: 100%;
    height: 48px;
    padding: $margin;
    font-size: 12px;
  }

  /deep/.card-thumbnail-wrapper {
    max-width: 100%;
  }

</style>
