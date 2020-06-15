<template>

  <router-link
    :to="link"
    class="card"
    :style="{ backgroundColor: $themeTokens.surface, color: $themeTokens.text }"
  >
    <div
      class="card-heading"
      :style="{ borderBottom: `1px solid ${$themeTokens.fineLine}` }"
    >
      <h3 class="title" dir="auto">
        <TextTruncator
          :text="title"
          :maxHeight="maxTitleHeight"
        />
      </h3>
    </div>

    <div class="card-content">

      <CardThumbnail
        class="thumbnail"
        v-bind="{ thumbnail, progress, kind, isMobile, showContentIcon }"
        :showContentIcon="false"
      />
      <p
        v-if="tagline"
        class="text"
        dir="auto"
      >
        {{ tagline }}
      </p>
    </div>
    <div class="card-footer">
      <CoachContentLabel
        v-if="isUserLoggedIn && !isLearner"
        class="coach-content-label"
        :value="numCoachContents"
        :isTopic="isTopic"
      />
      <KButton
        v-if="copiesCount > 1"
        appearance="basic-link"
        class="copies"
        :text="$tr('copies', { num: copiesCount })"
        @click.prevent="$emit('openCopiesModal', contentId)"
      />
    </div>
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
      subtitle: {
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
      contentId: {
        type: String,
        required: false,
      },
      copiesCount: {
        type: Number,
        required: false,
      },
    },
    computed: {
      ...mapGetters(['isLearner', 'isUserLoggedIn']),
      isTopic() {
        return this.kind === ContentNodeKinds.TOPIC || this.kind === ContentNodeKinds.CHANNEL;
      },
      maxTitleHeight() {
        if (this.hasFooter && this.subtitle) {
          return 20;
        } else if (this.hasFooter || this.subtitle) {
          return 40;
        }
        return 60;
      },
      hasFooter() {
        return this.numCoachContents > 0 || this.copiesCount > 1;
      },
    },
    $trs: {
      copies: '{ num, number} locations',
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
    padding: 0 $margin;
    border-bottom: 2px solid #cecece;
  }

  .card-content {
    width: 100%;
    padding: $margin;
  }

  .thumbnail {
    position: relative;
    display: inline-block;
    width: 38.2%; // golden ratio
  }

  .text {
    position: relative;
    display: inline-block;
    width: 61.8%; // golden ratio
    padding: 0 0 0 $margin;
    margin: 0;
    vertical-align: top;
  }

  .subtitle {
    margin: 0;
  }

  .subtitle {
    position: absolute;
    top: 38px;
    right: $margin;
    left: $margin;
    overflow: hidden;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-footer {
    display: block;
    width: 100%;
    height: 48px;
    padding: $margin;
    font-size: 12px;
  }

  .subtitle.no-footer {
    top: unset;
    bottom: $margin;
  }

  .copies {
    display: inline-block;
    float: right;
  }

</style>
