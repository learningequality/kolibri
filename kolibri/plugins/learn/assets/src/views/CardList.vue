<template>

  <router-link :to="link" :class="$computedClass({ ':focus': $coreOutline })">
    <div
      class="card"
      :class="{ 'mobile-card': isMobile }"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <KFixedGrid numCols="4">
        <KFixedGridItem :span="isMobile ? 4 : 1" class="thumb-area">
          <CardThumbnail :contentNode="content" :hideDuration="!windowIsLarge" />
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
              <LearningActivityLabel
                :contentNode="content"
                :hideDuration="true"
                labelAfter
                condensed
              />
            </div>
            <h3 :style="{ marginTop: '4px', marginBottom: '4px' }">
              <TextTruncatorCss :text="content.title" :maxLines="1" />
            </h3>
            <p
              v-if="content.description"
              style="font-size: 14px; marginTop: 4px; marginBottom: 4px;"
            >
              <TextTruncatorCss :text="content.description" :maxLines="2" />
            </p>
            <div v-if="!isMobile" class="bottom-items">
              <LearningActivityDuration
                v-if="!windowIsLarge"
                :contentNode="content"
                :class="categoryAndLevelString ? 'duration prepends' : 'duration'"
                condensed
                :style="{ color: $themePalette.grey.v_700, marginTop: 0 }"
              />
              <p
                v-if="categoryAndLevelString"
                class="metadata-info"
                :style="{ color: $themePalette.grey.v_700, marginTop: 0 }"
              >{{ categoryAndLevelString }}</p>
              <div>
                <img
                  v-if="channelThumbnail"
                  :src="channelThumbnail"
                  :alt="learnString('logo', { channelTitle: channelTitle })"
                  class="channel-logo"
                  :style="{ color: $themePalette.grey.v_700 }"
                >
                <p
                  v-else
                  class="metadata-info"
                  :style="{ color: $themePalette.grey.v_700, marginTop: 0 }"
                >{{ learnString('logo', { channelTitle: channelTitle }) }}</p>
                <KButton
                  v-if="isLibraryPage && content.copies"
                  appearance="basic-link"
                  class="copies"
                  :style="{ color: $themeTokens.text }"
                  :text="coreString('copies', { num: content.copies.length })"
                  @click.prevent="$emit('openCopiesModal', content.copies)"
                />
              </div>
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
  import { ContentLevels, Categories } from 'kolibri.coreVue.vuex.constants';
  import camelCase from 'lodash/camelCase';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useChannels from '../composables/useChannels';
  import { PageNames } from '../constants';
  import ProgressBar from './ProgressBar';
  import LearningActivityLabel from './LearningActivityLabel';
  import LearningActivityDuration from './LearningActivityDuration';
  import commonLearnStrings from './commonLearnStrings';
  import CardThumbnail from './HybridLearningContentCard/CardThumbnail';

  export default {
    name: 'CardList',
    components: {
      CardThumbnail,
      TextTruncatorCss,
      LearningActivityLabel,
      LearningActivityDuration,
      ProgressBar,
    },
    mixins: [responsiveWindowMixin, commonLearnStrings, commonCoreStrings],
    setup() {
      const { getChannelThumbnail, getChannelTitle } = useChannels();
      return {
        getChannelThumbnail,
        getChannelTitle,
      };
    },
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
      categoryAndLevelString() {
        if (this.levels(this.content.grade_levels) && this.category(this.content.categories)) {
          return (
            this.category(this.content.categories) + ' | ' + this.levels(this.content.grade_levels)
          );
        } else if (this.category(this.content.categories)) {
          return this.category(this.content.categories);
        } else if (this.levels(this.content.grade_levels)) {
          return this.levels(this.content.grade_levels);
        }
        return null;
      },
      channelThumbnail() {
        return this.getChannelThumbnail(this.content && this.content.channel_id);
      },
      channelTitle() {
        return this.getChannelTitle(this.content && this.content.channel_id);
      },
    },
    methods: {
      levels(levels) {
        const matches = Object.keys(ContentLevels)
          .sort()
          .filter(k => levels.includes(ContentLevels[k]));
        if (matches && matches.length > 0) {
          let adjustedMatches = [];
          matches.map(key => {
            let translationKey;
            if (key === 'PROFESSIONAL') {
              translationKey = 'specializedProfessionalTraining';
            } else if (key === 'WORK_SKILLS') {
              translationKey = 'allLevelsWorkSkills';
            } else if (key === 'BASIC_SKILLS') {
              translationKey = 'allLevelsBasicSkills';
            } else {
              translationKey = camelCase(key);
            }
            adjustedMatches.push(translationKey);
          });
          adjustedMatches = adjustedMatches.map(m => this.coreString(m)).join(', ');
          return adjustedMatches;
        }
      },
      category(options) {
        const matches = Object.keys(Categories)
          .sort()
          .filter(k => options.includes(Categories[k]));
        if (matches && matches.length > 0) {
          return matches.map(m => this.coreString(camelCase(m))).join(', ');
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  $footer-height: 36px;
  $h-padding: 24px;
  $v-padding: 16px;

  a {
    display: block;
  }

  .card {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-block;
    width: 100%;
    min-height: 246px;
    padding: $v-padding $h-padding;
    margin-top: $h-padding;
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
    display: inline-block;
    padding-left: 2px;
    font-size: 13px;
  }

  .channel-logo {
    display: inline-block;
    height: 24px;
    margin-right: 8px;
    font-size: 13px;
  }

  .copies {
    display: inline-block;
    padding: 8px;
    font-size: 13px;
    text-decoration: none;
    vertical-align: top;
  }

  .duration {
    display: inline-block;
    margin-top: 4px;
    font-size: 13px;
  }

  .prepends {
    &::after {
      content: ' | ';
    }
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
