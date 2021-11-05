<template>

  <div
    class="card"
    :class="[
      { 'mobile-card': isMobile },
      $computedClass({ ':focus': $coreOutline })
    ]"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <router-link
      :to="link"
    >
      <div
        v-if="!isMobile"
        class="folder-header"
        :style="{ backgroundColor: (!isLeaf ? $themeTokens.text : null ) }"
      ></div>
      <div class="thumbnail">
        <CardThumbnail
          v-bind="{ thumbnail, kind, isMobile }"
          :activityLength="activityLength"
        />
        <p
          v-if="!isMobile && isBookmarksPage"
          class="metadata-info"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ bookmarkCreated }}
        </p>
      </div>
      <span class="details" :style="{ color: $themeTokens.text }">
        <div
          class="metadata-info"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          <LearningActivityLabel :contentNode="contentNode" class="learning-activity-label" />
        </div>
        <h3 class="title">
          <TextTruncator
            :text="title"
            :maxHeight="maxTitleHeight"
          />
        </h3>
        <p class="text">
          <TextTruncator
            :text="description"
            :maxHeight="maxDescriptionHeight"
          />
        </p>
        <div v-if="displayCategoryAndLevelMetadata && !isMobile" class="metadata-info">
          <p> {{ coreString(displayCategoryAndLevelMetadata) }}</p>
        </div>
        <img
          v-if="!isMobile"
          :src="channelThumbnail"
          :alt="learnString('logo', { channelTitle: channelTitle })"
          class="channel-logo"
        >
        <KButton
          v-if="!isMobile && isLibraryPage"
          appearance="basic-link"
          class="copies"
          :style="{ color: $themeTokens.text }"
          :text="coreString('copies', { num: copiesCount })"
          @click.prevent="$emit('openCopiesModal', contentId)"
        />
      </span>
    </router-link>
    <div class="footer">
      <p
        v-if="isMobile && isBookmarksPage"
        class="metadata-info-footer"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ bookmarkCreated }}
      </p>
      <ProgressBar v-else :contentNode="contentNode" />
      <div class="footer-icons">
        <KIconButton
          v-for="(value, key) in footerIcons"
          :key="key"
          :icon="key"
          size="mini"
          :color="$themePalette.grey.v_400"
          :ariaLabel="coreString(value)"
          :tooltip="coreString(value)"
          @click="$emit(value)"
        />
      </div>
    </div>
  </div>

</template>


<script>

  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
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
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        default: null,
      },
      createdDate: {
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
      level: {
        type: String,
        default: null,
      },
      category: {
        type: String,
        default: null,
      },
      contentNode: {
        type: Object,
        required: true,
      },
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      isLeaf: {
        type: Boolean,
        default: false,
      },
      isMobile: {
        type: Boolean,
        default: false,
      },
      contentId: {
        type: String,
        default: null,
      },
      currentPage: {
        type: String,
        default: null,
      },
      copiesCount: {
        type: Number,
        default: null,
      },
      activityLength: {
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
        return 100;
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

  $margin: 24px;

  .card {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-block;
    width: 100%;
    height: 246px;
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
    display: flex;
    justify-content: flex-end;
    width: 100%;
    padding: $margin;
  }

  .learning-activity-label {
    width: 100px;
    /deep/ .learning-activity {
      justify-content: flex-start;
    }
  }

  .metadata-info-footer {
    flex: auto;
    align-self: center;
    margin: 0;
  }

  .footer-icons {
    position: absolute;
    right: 16px;
    bottom: 16px;
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

  .k-linear-loader {
    display: block;
    width: 240px;
    margin-top: -4px;
  }

  .thumbnail {
    display: inline-block;
    width: 240px;
    height: 100px;
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
