<template>

  <router-link :to="link" :class="$computedClass({ ':focus': $coreOutline })">
    <div
      class="card"
      :class="{ 'mobile-card': isMobile }"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <KFixedGrid numCols="4">
        <KFixedGridItem :span="isMobile ? 4 : 1" class="thumb-area">
          <CardThumbnail :contentNode="content" />
          <p
            v-if="isBookmarksPage && !isMobile"
            class="created-info"
            :style="{ color: $themePalette.grey.v_700 }"
          >
            {{ bookmarkCreated }}
          </p>
          <ProgressBar v-if="!isMobile" :contentNode="content" />
        </KFixedGridItem>

        <KFixedGridItem :span="isMobile ? 4 : 3" class="text-area">
          <span :style="{ color: $themeTokens.text }">
            <div class="metadata-info" :style="{ color: $themePalette.grey.v_700 }">
              <LearningActivityLabel :contentNode="content" labelAfter condensed />
            </div>
            <h3>
              <TextTruncatorCss :text="content.title" :maxLines="1" />
            </h3>
            <p v-if="content.description" style="font-size: 14px;">
              <TextTruncatorCss :text="content.description" :maxLines="4" />
            </p>
            <div v-if="!isMobile" class="bottom-items">
              <p v-if="categoryAndLevelString">{{ categoryAndLevelString }}</p>
              <img
                :src="content.channel_thumbnail"
                :alt="learnString('logo', { channelTitle: content.channel_title })"
                class="channel-logo"
              >
              <KButton
                v-if="isLibraryPage && content.copies"
                appearance="basic-link"
                class="copies"
                :style="{ color: $themeTokens.text }"
                :text="coreString('copies', { num: content.copies.length })"
                @click.prevent="$emit('openCopiesModal', content.copies)"
              />
            </div>
          </span>
        </KFixedGridItem>
      </KFixedGrid>
      <div class="footer">
        <p
          v-if="isBookmarksPage && isMobile"
          class="created-info-mobile"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ bookmarkCreated }}
        </p>
        <ProgressBar v-if="!!isMobile" :contentNode="content" class="footer-progress" />

        <div class="footer-icons">
          <KIconButton
            v-for="(value, key) in footerIcons"
            :key="key"
            :icon="key"
            size="mini"
            :color="$themePalette.grey.v_600"
            :ariaLabel="coreString(value)"
            :tooltip="coreString(value)"
            class="icon-fix"
            @click.prevent="$emit(value)"
          />
        </div>
      </div>
    </div>
  </router-link>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import TextTruncatorCss from 'kolibri.coreVue.components.TextTruncatorCss';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { now } from 'kolibri.utils.serverClock';
  import { PageNames } from '../constants';
  import ProgressBar from './ProgressBar';
  import LearningActivityLabel from './LearningActivityLabel';
  import commonLearnStrings from './commonLearnStrings';
  import CardThumbnail from './HybridLearningContentCard/CardThumbnail';

  export default {
    name: 'HybridLearningContentCardListView',
    components: {
      CardThumbnail,
      TextTruncatorCss,
      LearningActivityLabel,
      ProgressBar,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    props: {
      createdDate: {
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
      categoryAndLevelString() {
        if (this.category && this.level) {
          return this.coreString(this.category) + ' | ' + this.coreString(this.level);
        } else if (this.category) {
          return this.coreString(this.category);
        } else if (this.level) {
          return this.coreString(this.level);
        }
        return null;
      },
      isBookmarksPage() {
        return this.currentPage === PageNames.BOOKMARKS;
      },
      isLibraryPage() {
        return this.currentPage === PageNames.LIBRARY;
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

  $footer-height: 36px;
  $h-padding: 24px;
  $v-padding: 16px;

  .card {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-block;
    width: 100%;
    min-height: 246px;
    padding: $v-padding $h-padding;
    margin-bottom: 24px;
    text-decoration: none;
    vertical-align: top;
    border-radius: 8px;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-4dp;
    }
  }

  .mobile-card {
    min-height: 490px;
  }

  .metadata-info {
    font-size: 14px;
  }

  .channel-logo {
    display: inline-block;
    height: 24px;
    margin-right: 8px;
  }

  .copies {
    display: inline-block;
    padding: 8px;
    font-size: 13px;
    text-decoration: none;
    vertical-align: top;
  }

  .footer {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 100%;
    height: $footer-height;
  }

  .footer-icons {
    position: absolute;
    right: 0;
    bottom: 0;
    display: inline-block;
    margin-right: $h-padding;
    margin-bottom: $v-padding;
  }
  .footer-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    display: inline-block;
    max-width: 60%;
    margin-bottom: 8px;
    margin-left: $h-padding;
  }

  .created-info-mobile {
    position: absolute;
    bottom: 8px;
    left: 0;
    display: inline-block;
    margin-bottom: $v-padding;
    margin-left: $h-padding;
  }

  .created-info {
    font-size: 13px;
  }

  .icon-fix {
    // this override fixes an existing KDS bug with
    // the hover state circle being squished
    // and can be removed upon that hover state fix
    width: 32px !important;
    height: 32px !important;
    /deep/ svg {
      top: 4px !important;
    }
  }

  .bottom-items {
    margin-top: 8px;
  }

  .thumb-area {
    margin-bottom: 16px;
  }

  .details {
    max-width: 100%;
    margin-top: 240px;
  }

  .text-area {
    margin-bottom: $footer-height;
  }

  .coach-footer-icon {
    max-width: 24px;
  }

</style>
