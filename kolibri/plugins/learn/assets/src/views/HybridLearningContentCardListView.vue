<template>

  <router-link :to="link" :class="$computedClass({ ':focus': $coreOutline })">
    <div
      class="card"
      :class="{ 'mobile-card': isMobile }"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <div
        v-if="!isMobile"
        class="folder-header"
        :style="{ backgroundColor: (!content.is_leaf ? $themeTokens.text : null ) }"
      ></div>
      <div class="thumbnail">
        <CardThumbnail
          :kind="content.kind"
          v-bind="{ thumbnail, isMobile }"
          :activityLength="content.duration"
        />
      </div>
      <span class="details" :style="{ color: $themeTokens.text }">
        <div
          class="metadata-info"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          <LearningActivityLabel
            :contentNode="content"
            labelAfter
            condensed
          />
        </div>
        <h3 class="title">
          <TextTruncator
            :text="content.title"
            :maxHeight="maxTitleHeight"
          />
        </h3>
        <p class="text">
          <TextTruncator
            :text="content.description"
            :maxHeight="maxDescriptionHeight"
          />
        </p>
        <div v-if="displayCategoryAndLevelMetadata && !isMobile" class="metadata-info">
          <p> {{ coreString(displayCategoryAndLevelMetadata) }}</p>
        </div>
        <img
          v-if="!isMobile"
          :src="content.channel_thumbnail"
          :alt="learnString('logo', { channelTitle: content.channel_title })"
          class="channel-logo"
        >
        <KButton
          v-if="!isMobile && isLibraryPage && content.copies"
          appearance="basic-link"
          class="copies"
          :style="{ color: $themeTokens.text }"
          :text="coreString('copies', { num: content.copies.length })"
          @click.prevent="$emit('openCopiesModal', content.copies)"
        />
      </span>
      <div class="footer">
        <div class="footer-elements">
          <div class="footer-progress">
            <p
              v-if="isBookmarksPage"
              class="metadata-info-footer"
              :style="{ color: $themePalette.grey.v_700 }"
            >
              {{ bookmarkCreated }}
            </p>
            <ProgressBar :contentNode="content" />
          </div>
        </div>
        <div class="footer-elements footer-icons">
          <KIconButton
            v-for="(value, key) in footerIcons"
            :key="key"
            :icon="key"
            size="mini"
            :color="$themePalette.grey.v_400"
            :ariaLabel="coreString(value)"
            :tooltip="coreString(value)"
            @click.prevent="$emit(value)"
          />
        </div>
      </div>
    </div>
  </router-link>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { now } from 'kolibri.utils.serverClock';
  import { PageNames } from '../constants';
  import ProgressBar from './ProgressBar';
  import LearningActivityLabel from './cards/ResourceCard/LearningActivityLabel';
  import commonLearnStrings from './commonLearnStrings';
  import CardThumbnail from './HybridLearningContentCard/CardThumbnail';

  export default {
    name: 'HybridLearningContentCardListView',
    components: {
      CardThumbnail,
      TextTruncator,
      LearningActivityLabel,
      ProgressBar,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    props: {
      createdDate: {
        type: String,
        default: null,
      },
      thumbnail: {
        type: String,
        default: null,
      },
      content: {
        type: Object,
        required: true,
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
      currentPage: {
        type: String,
        default: null,
      },
      footerIcons: {
        type: Object,
        default: null,
      },
    },
    data: () => ({
      now: now(),
    }),
    computed: {
      maxTitleHeight() {
        return 40;
      },
      maxDescriptionHeight() {
        return 64;
      },
      displayCategoryAndLevelMetadata() {
        if (this.category && this.level) {
          return `${this.category}| ${this.level} `;
        } else if (this.category) {
          return this.category;
        } else if (this.level) {
          return this.level;
        } else {
          return null;
        }
      },
      isLibraryPage() {
        return this.currentPage === PageNames.LIBRARY;
      },
      isBookmarksPage() {
        return this.currentPage === PageNames.BOOKMARKS;
      },
      ceilingDate() {
        if (this.createdDate > this.now) {
          return this.now;
        }
        return this.createdDate;
      },
      bookmarkCreated() {
        const time = this.$formatRelative(this.ceilingDate, { now: this.now });
        return this.coreString('bookmarkedTimeAgoLabel', { time });
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import './ContentCard/card';

  .card {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-block;
    width: 100%;
    height: 246px;
    margin-bottom: 24px;
    text-decoration: none;
    vertical-align: top;
    border-radius: 8px;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-4dp;
    }
  }

  .details {
    display: inline-block;
    max-width: calc(100% - 350px);
    margin: 24px;
    margin-top: 8px;
    vertical-align: top;
  }

  .title {
    margin: 0;
  }

  .text {
    font-size: 14px;
  }

  .metadata-info {
    margin-top: 8px;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .channel-logo {
    display: inline-block;
    height: 24px;
    margin: 4px;
  }

  .copies {
    display: inline-block;
    padding: 8px;
    font-size: 13px;
    text-decoration: none;
    vertical-align: top;
  }

  .folder-header {
    width: 100%;
    height: 15px;
    border-radius: 8px 8px 0 0;
  }

  .footer {
    position: absolute;
    bottom: 0;
    width: 100%;
    padding: 16px 24px;
  }

  .metadata-info-footer {
    margin: 0;
    font-size: 13px;
  }

  .footer-elements {
    position: relative;
    display: block;
  }

  .footer-progress {
    width: 240px;
  }

  .footer-icons {
    // this override fixes an existing KDS bug with
    // the hover state circle being squished
    // and can be removed upon that hover state fix
    float: right;
    .button {
      width: 32px !important;
      height: 32px !important;
      /deep/ svg {
        top: 4px !important;
      }
    }
  }

  .k-linear-loader {
    display: block;
    width: 240px;
    margin-top: -4px;
  }

  .thumbnail {
    display: inline-block;
    width: 240px;
    margin-top: 8px;
    margin-right: 24px;
    margin-left: 24px;
  }

  .mobile-card.card {
    width: 100%;
    height: 490px;
  }

  .mobile-card {
    .thumbnail {
      position: absolute;
      top: 24px;
      width: calc(100% - 48px);
      height: calc(100% - 24px);
      margin-left: 24px;
    }
    .details {
      max-width: 100%;
      margin-top: 224px;
    }
  }

</style>
