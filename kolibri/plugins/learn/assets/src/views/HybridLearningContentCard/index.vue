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
        <div v-if="!content.is_leaf">
          <KIcon icon="topic" color="white" class="folder-header-bar" />
          <p class="folder-header-text">
            {{ coreString('folder') }}
          </p>
        </div>
        <LearningActivityLabel
          v-if="content.is_leaf"
          :labelAfter="true"
          :contentNode="content"
          :hideDuration="true"
          class="learning-activity-label"
          :style="{ color: $themeTokens.text }"
        />
        <img
          v-if="content.is_leaf && content.channel_thumbnail.length > 0"
          :src="content.channel_thumbnail"
          :alt="learnString('logo', { channelTitle: content.channel_title })"
          class="channel-logo"
        >
      </div>
      <CardThumbnail
        class="thumbnail"
        :kind="content.kind"
        v-bind="{ thumbnail, isMobile }"
      />
      <div class="text" :style="{ color: $themeTokens.text }">
        <h3 class="title" dir="auto">
          <TextTruncatorCss
            :text="content.title"
            :maxLines="5"
          />
        </h3>
        <KButton
          v-if="content.copies"
          appearance="basic-link"
          class="copies"
          :text="coreString('copies', { num: content.copies.length })"
          @click.prevent="$emit('openCopiesModal', content.copies)"
        />
      </div>
    </router-link>
    <div class="footer">
      <ProgressBar
        :contentNode="content"
        :style="{ maxWidth: `calc(100% - ${32 * footerLength}px)` }"
      />
      <div class="footer-icons">
        <CoachContentLabel
          v-if="isUserLoggedIn && !isLearner && content.num_coach_contents"
          :style="coachContentLabelStyles"
          class="coach-content-label"
          :value="content.num_coach_contents"
          :isTopic="isTopic"
        />
        <KIconButton
          v-if="content.is_leaf"
          icon="infoOutline"
          size="mini"
          :color="$themePalette.grey.v_600"
          :ariaLabel="coreString('viewInformation')"
          :tooltip="coreString('viewInformation')"
          @click="$emit('toggleInfoPanel')"
        />
        <slot name="actions"></slot>
      </div>
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import TextTruncatorCss from 'kolibri.coreVue.components.TextTruncatorCss';
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
      TextTruncatorCss,
      LearningActivityLabel,
      ProgressBar,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    props: {
      thumbnail: {
        type: String,
        default: null,
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
      content: {
        type: Object,
        required: true,
      },
    },
    computed: {
      ...mapGetters(['isLearner', 'isUserLoggedIn']),
      isTopic() {
        return !this.content.is_leaf;
      },
      headerStyles() {
        let styles = {};
        if (!this.content.is_leaf) {
          styles = {
            backgroundColor: this.$themeTokens.text,
            borderRadius: '8px 8px 0 0',
            color: this.$themeTokens.textInverted,
          };
        }
        return styles;
      },
      footerLength() {
        return (
          this.content.is_leaf +
          (this.isUserLoggedIn && !this.isLearner && this.content.num_coach_contents) +
          (this.content.num_coach_contents > 0) +
          (this.content.copies > 1) +
          (this.$slots.actions ? this.$slots.actions.length : 0)
        );
      },
      coachContentLabelStyles() {
        if (this.content.num_coach_contents < 2 && !this.isTopic) {
          return { maxWidth: '24px', marginTop: '4px' };
        } else if (this.content.num_coach_contents < 2 && this.isTopic) {
          return { maxWidth: '24px', marginTop: '4px', marginRight: '16px' };
        } else {
          return {};
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import './card';

  $margin: 16px;
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

  .copies {
    display: inline-block;
    font-size: 13px;
    text-decoration: none;
    vertical-align: top;
  }

  .header-bar {
    display: flex;
    justify-content: space-between;
    height: 48px;
    padding: 8px 16px;
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
    font-size: 13px;
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
    padding: 0 $margin $margin $margin;
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
