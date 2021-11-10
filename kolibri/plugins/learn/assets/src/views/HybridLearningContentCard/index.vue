<template>

  <div class="card drop-shadow">
    <router-link
      :to="link"
      class="card card-link"
      :class="[
        { 'mobile-card': isMobile },
        $computedClass({ ':focus': $coreOutline })
      ]"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <div class="header-bar" :style="headerStyles">
        <div v-if="!isLeaf">
          <KIcon icon="topic" color="white" class="folder-header-bar" />
          <p class="folder-header-text">
            {{ coreString('folder') }}
          </p>
        </div>
        <LearningActivityLabel
          v-if="isLeaf"
          :contentNode="contentNode"
          :hideDuration="true"
          class="learning-activity-label"
          :style="{ color: $themeTokens.text }"
        />
        <img
          v-if="isLeaf"
          :src="channelThumbnail"
          :alt="learnString('logo', { channelTitle: channelTitle })"
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
      </div>
    </router-link>
    <div class="footer">
      <ProgressBar
        :contentNode="contentNode"
        :style="{ maxWidth: `calc(100% - ${32 * footerLength}px)` }"
      />
      <div class="footer-icons">
        <CoachContentLabel
          v-if="isUserLoggedIn && !isLearner && numCoachContents"
          class="coach-content-label"
          :value="numCoachContents"
          :isTopic="isTopic"
        />
        <KIconButton
          v-if="isLeaf"
          icon="infoOutline"
          size="mini"
          :color="$themePalette.grey.v_600"
          :ariaLabel="coreString('viewInformation')"
          :tooltip="coreString('viewInformation')"
          @click="$emit('toggleInfoPanel')"
        />
        <KButton
          v-if="copiesCount > 1"
          appearance="basic-link"
          class="copies"
          :text="coreString('copies', { num: copiesCount })"
          @click.prevent="$emit('openCopiesModal', contentId)"
        />
        <slot name="actions"></slot>
      </div>
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ProgressBar from '../ProgressBar';
  import LearningActivityLabel from '../cards/ResourceCard/LearningActivityLabel';
  import commonLearnStrings from '../commonLearnStrings';
  import CardThumbnail from './CardThumbnail.vue';

  export default {
    name: 'HybridLearningContentCard',
    components: {
      CardThumbnail,
      CoachContentLabel,
      TextTruncator,
      LearningActivityLabel,
      ProgressBar,
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
      contentNode: {
        type: Object,
        required: true,
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
      headerStyles() {
        let styles = {};
        if (!this.isLeaf) {
          styles = {
            backgroundColor: this.$themeTokens.text,
            borderRadius: '8px 8px 0 0',
            color: this.$themeTokens.textInverted,
          };
        }
        return styles;
      },
      maxTitleHeight() {
        if (this.footerLength && this.subtitle) {
          return 20;
        } else if (this.footerLength || this.subtitle) {
          return 40;
        }
        return 66;
      },
      footerLength() {
        return (
          1 +
          this.isLeaf +
          (this.isUserLoggedIn && !this.isLearner && this.numCoachContents) +
          (this.numCoachContents > 0) +
          (this.copiesCount > 1) +
          (this.$slots.actions ? this.$slots.actions.length : 0)
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import './card';

  $margin: 24px;
  $margin-thin: 8px;

  .drop-shadow {
    @extend %dropshadow-1dp;
    &:hover {
      @extend %dropshadow-8dp;
    }
  }

  .card {
    position: relative;
    display: inline-block;
    width: 100%;
    vertical-align: top;
    border-radius: 8px;
    transition: box-shadow $core-time ease;
    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .card-link {
    text-decoration: none;
  }

  .header-bar {
    display: flex;
    justify-content: space-between;
    padding: 8px 18px;
    font-size: 13px;
    .channel-logo {
      align-self: end;
      height: 28px;
      margin-bottom: 4px;
    }
  }

  .folder-header-bar {
    display: inline-block;
    margin-right: 8px;
    font-size: 16px;
  }

  .folder-header-text {
    display: inline-block;
    padding: 0;
    margin: 0;
    font-size: 16px;
  }

  .k-labeled-icon {
    display: inline-block;
    max-width: calc(100% - 50px);
    height: 24px;
    margin-bottom: 0;
    vertical-align: top;
  }

  .text {
    position: relative;
    height: 190px;
    padding: $margin;
  }

  .footer {
    position: absolute;
    bottom: 0;
    display: flex;
    width: 100%;
    padding: $margin;
  }

  .footer-icons {
    position: absolute;
    right: $margin-thin;
    bottom: $margin-thin;
    display: inline;
    // this override fixes an existing KDS bug with
    // the hover state circle being squished
    // and can be removed upon that hover state fix
    .button {
      width: 32px !important;
      height: 32px !important;
      /deep/ svg {
        top: 4px !important;
      }
    }
  }

  .coach-content-label {
    max-width: 30px;
    vertical-align: top;
  }

  .learning-activity-label {
    top: 0;
    display: inline-block;
    width: 60%;
    /deep/ .learning-activity {
      justify-content: flex-start;
      margin-top: 2px;
    }
  }

  .mobile-card.card {
    width: 100%;
    height: 490px;
  }

  .mobile-card {
    .thumbnail {
      position: absolute;
    }
    .text {
      height: 84px;
      margin-top: $thumb-height-mobile-hybrid-learning;
    }
  }

</style>
