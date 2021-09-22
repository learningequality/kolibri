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
        class="folder-header"
        :style="{ backgroundColor: (!isLeaf ? $themeTokens.text : null ) }"
      ></div>
      <div class="thumbnail">
        <CardThumbnail
          v-bind="{ thumbnail, kind, isMobile }"
          :activityLength="activityLength"
        />
        <p v-if="!isMobile" class="metadata-info">
          {{ bookmarkCreated }}
        </p>
        <KLinearLoader
          v-if="progress"
          class="k-linear-loader"
          :delay="false"
          :progress="progress"
          type="determinate"
          :style="{ backgroundColor: $themeTokens.fineLine }"
        />
      </div>
      <span class="details" :style="{ color: $themeTokens.text }">
        <div class="metadata-info">
          <KLabeledIcon
            :icon="kind === 'topic' ? 'topic' : `${kindToLearningActivity}Solid`"
            size="mini"
            :label="
              `${coreString(kindToLearningActivity)}
              ${isMobile ? ' | ' : '' }
              ${isMobile ? coreString(activityLength) : ''}`
            "
          />
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
        <div v-if="displayCategoryAndLevelMetadata" class="metadata-info">
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
          :text="coreString('copies', { num: copiesCount })"
          @click.prevent="$emit('openCopiesModal', contentId)"
        />
      </span>
    </router-link>
    <div class="footer">
      <p v-if="isMobile" class="metadata-info-footer">
        {{ bookmarkCreated }}
      </p>
      <KIconButton
        v-for="(value, key) in footerIcons"
        :key="key"
        :icon="key"
        :class="isRtl ? 'footer-right' : 'footer-left'"
        size="mini"
        :color="$themePalette.grey.v_400"
        :ariaLabel="coreString(value)"
        :tooltip="coreString(value)"
        @click="$emit(value)"
      />
      <KLinearLoader
        v-if="progress && isMobile"
        class="k-linear-loader"
        :delay="false"
        :progress="progress"
        type="determinate"
        :style="{ backgroundColor: $themeTokens.fineLine }"
      />
    </div>
  </div>

</template>


<script>

  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import {
    LearningActivities,
    ContentKindsToLearningActivitiesMap,
  } from 'kolibri.coreVue.vuex.constants';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { now } from 'kolibri.utils.serverClock';
  import { PageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';
  import CardThumbnail from './ContentCard/CardThumbnail';

  export default {
    name: 'ContentCardListViewItem',
    components: {
      CardThumbnail,
      TextTruncator,
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
          return this.category`| ${this.level} `;
        } else if (this.category) {
          return this.category;
        } else if (this.level) {
          return this.level;
        } else {
          return null;
        }
      },
      kindToLearningActivity() {
        let activity = '';
        if (this.kind === 'topic') {
          return 'folder';
        } else if (Object.values(LearningActivities).includes(this.kind)) {
          activity = this.kind;
          return `${activity}`;
        } else {
          // otherwise reassign the old content types to the new metadata
          activity = ContentKindsToLearningActivitiesMap[this.kind];
          return `${activity}`;
        }
      },
      isLibraryPage() {
        return this.pageName === PageNames.LIBRARY;
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

  $margin: 16px;

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
    vertical-align: top;
  }

  .title {
    margin: 0;
  }

  .text {
    font-size: 14px;
  }

  .metadata-info {
    margin-bottom: 6px;
    font-size: 13px;
    color: #616161;
  }

  .metadata-info-footer {
    display: inline-block;
    margin: 0;
    font-size: 13px;
    color: #616161;
  }

  .channel-logo {
    display: inline-block;
    height: 24px;
    margin: 4px;
  }

  .copies {
    display: inline-block;
    padding: 6px 8px;
    font-size: 13px;
    color: black;
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
    right: $margin;
    bottom: $margin;
    left: $margin;
    min-height: 30px;
    font-size: 12px;
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
    margin-right: 24px;
    margin-left: 24px;
  }

  .footer-left {
    display: block;
    float: right;
  }
  .footer-right {
    display: block;
    float: left;
  }

  .mobile-card.card {
    width: 100%;
    height: 490px;
  }

  .mobile-card {
    .thumbnail {
      position: absolute;
      width: 100%;
      margin: 0;
    }
    .details {
      max-width: 100%;
      padding: 8px;
      margin-top: $thumb-height-mobile;
    }
  }

</style>
