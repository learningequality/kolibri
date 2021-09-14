<template>

  <router-link
    :to="link"
    class="card"
    :class="[
      { 'mobile-card': isMobile },
      $computedClass({ ':focus': $coreOutline })
    ]"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <div class="header-bar">
      <KLabeledIcon
        :icon="kind === 'topic' ? 'topic' : `${kindToLearningActivity}Solid`"
        :label="coreString(kindToLearningActivity)"
        class="k-labeled-icon"
      />
      <img
        :src="channelThumbnail"
        :alt="$tr('logo', { channelTitle: channelTitle })"
        class="channel-logo"
      >
    </div>
    <CardThumbnail
      class="thumbnail"
      v-bind="{ thumbnail, kind, isMobile }"
    />
    <div class="text" :style="{ color: $themeTokens.text }">
      <h3 class="title" dir="auto">
        <TextTruncator
          :text="title"
          :maxHeight="maxTitleHeight"
        />
      </h3>
      <p
        v-if="subtitle"
        dir="auto"
        class="subtitle"
      >
        {{ subtitle }}
      </p>
      <div class="footer">
        <KLinearLoader
          class="k-linear-loader"
          :delay="false"
          :progress="progress"
          type="determinate"
          :style="{ backgroundColor: $themeTokens.fineLine }"
        />
        <KIconButton
          icon="optionsVertical"
          class="info-icon"
          size="mini"
          :color="$themePalette.grey.v_400"
          :ariaLabel="coreString('moreOptions')"
          :tooltip="coreString('moreOptions')"
          @click="$emit('toggleOptions')"
        />
        <KIconButton
          icon="infoPrimary"
          class="info-icon"
          size="mini"
          :color="$themePalette.grey.v_400"
          :ariaLabel="coreString('viewInformation')"
          :tooltip="coreString('viewInformation')"
          @click="$emit('toggleInfoPanel')"
        />
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
          :text="coreString('copies', { num: copiesCount })"
          @click.prevent="$emit('openCopiesModal', contentId)"
        />
      </div>
    </div>
  </router-link>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import {
    LearningActivities,
    ContentKindsToLearningActivitiesMap,
  } from 'kolibri.coreVue.vuex.constants';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonLearnStrings from '../commonLearnStrings';
  import CardThumbnail from './CardThumbnail.vue';

  export default {
    name: 'ContentCard',
    components: {
      CardThumbnail,
      CoachContentLabel,
      TextTruncator,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    props: {
      title: {
        type: String,
        required: true,
      },
      subtitle: {
        type: String,
        default: null,
      },
      thumbnail: {
        type: String,
        default: null,
      },
      channelThumbnail: {
        type: String,
        default: null,
      },
      channelTitle: {
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
        default: null,
      },
      copiesCount: {
        type: Number,
        default: null,
      },
    },
    computed: {
      ...mapGetters(['isLearner', 'isUserLoggedIn']),
      isTopic() {
        return !this.isLeaf;
      },
      maxTitleHeight() {
        return 66;
      },
      kindToLearningActivity() {
        let activity = '';
        if (this.kind === 'topic') {
          return 'folder';
        } else if (Object.values(LearningActivities).includes(this.kind)) {
          activity = this.kind;
          return `${activity}Activity`;
        } else {
          // otherwise reassign the old content types to the new metadata
          activity = ContentKindsToLearningActivitiesMap[this.kind];
          return `${activity}Activity`;
        }
      },
    },
    $trs: {
      logo: {
        message: '{channelTitle} logo',
        context:
          'Added to the title channel to create a complete alt-text description of a logo. For example Khan Academy English Logo.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import './card';

  $margin: 16px;

  .coach-content-label {
    display: inline-block;
  }

  .card {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-block;
    width: 100%;
    text-decoration: none;
    vertical-align: top;
    border-radius: 8px;
    transition: box-shadow $core-time ease;
    &:hover {
      @extend %dropshadow-8dp;
    }
    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .header-bar {
    padding: 13px 18px 0;
    margin-bottom: 0;
    font-size: 13px;
  }

  .k-labeled-icon {
    display: inline-block;
    max-width: calc(100% - 50px);
    height: 24px;
    margin-bottom: 0;
    vertical-align: top;
  }

  .channel-logo {
    display: inline-block;
    float: right;
    height: 24px;
    margin-bottom: 0;
  }

  .text {
    position: relative;
    height: 190px;
    padding: $margin;
  }

  .footer {
    position: absolute;
    right: $margin;
    bottom: $margin;
    left: $margin;
    font-size: 12px;
  }

  .k-linear-loader {
    display: inline-block;
    max-width: 70%;
  }

  .info-icon {
    display: block;
    float: right;
  }
  .copies {
    display: inline-block;
    float: right;
  }

  .mobile-card.card {
    width: 100%;
    height: $thumb-height-mobile;
  }

  .mobile-card {
    .thumbnail {
      position: absolute;
    }
    .text {
      height: 84px;
      margin-left: $thumb-width-mobile;
    }
    .subtitle {
      top: 36px;
    }
  }

</style>
