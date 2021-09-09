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

    <div class="thumbnail">
      <CardThumbnail
        v-bind="{ thumbnail, kind, isMobile }"
      />
      <KLinearLoader
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
          :icon="`${kindToLearningActivity}Solid`"
          size="mini"
          :label="learnString(kindToLearningActivity)"
        />
      </div>
      <h3 class="title" dir="auto">
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
      <div class="metadata-info">
        <p> {{ displayCategoryAndLevelMetadata }}</p>
      </div>
      <img
        :src="channelThumbnail"
        :alt="$tr('logo', { channelTitle: channelTitle })"
        class="channel-logo"
      >
      <KButton
        appearance="basic-link"
        class="copies"
        :text="$tr('copies', { num: copiesCount })"
        @click.prevent="$emit('openCopiesModal', contentId)"
      />
    </span>
    <div class="footer">
      <KIconButton
        icon="optionsVertical"
        class="footer-icon"
        size="mini"
        :color="$themePalette.grey.v_400"
        :ariaLabel="$tr('moreOptions')"
        :tooltip="$tr('moreOptions')"
        @click="$emit('toggleOptions')"
      />
      <KIconButton
        icon="infoPrimary"
        class="footer-icon"
        size="mini"
        :color="$themePalette.grey.v_400"
        :ariaLabel="$tr('viewInformation')"
        :tooltip="$tr('viewInformation')"
        @click="$emit('toggleInfoPanel')"
      />
    </div>
  </router-link>

</template>


<script>

  import { validateLinkObject, validateContentNodeKind } from 'kolibri.utils.validators';
  import {
    LearningActivities,
    ContentKindsToLearningActivitiesMap,
  } from 'kolibri.coreVue.vuex.constants';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import commonLearnStrings from './commonLearnStrings';
  import CardThumbnail from './ContentCard/CardThumbnail';

  export default {
    name: 'ContentCardListViewItem',
    components: {
      CardThumbnail,
      TextTruncator,
    },
    mixins: [commonLearnStrings],
    props: {
      title: {
        type: String,
        required: true,
      },
      description: {
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
        default: '2',
      },
      category: {
        type: String,
        default: 'math',
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
      maxTitleHeight() {
        return 66;
      },
      maxDescriptionHeight() {
        return 40;
      },
      displayCategoryAndLevelMetadata() {
        if (this.category && this.level) {
          return `${this.category} | ${this.level} `;
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
        if (Object.values(LearningActivities).includes(this.kind)) {
          activity = this.kind;
        } else {
          // otherwise reassign the old content types to the new metadata
          activity = ContentKindsToLearningActivitiesMap[this.kind];
        }
        return activity;
      },
    },
    $trs: {
      copies: {
        message: '{ num, number} locations',
        context:
          'Some Kolibri resources may be duplicated in different topics or channels.\n\nSearch results will indicate when a resource is duplicated, and learners can click on the "...locations" link to discover the details for each location.',
      },
      viewInformation: {
        message: 'View information',
      },
      moreOptions: {
        message: 'More options',
      },
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
  @import './ContentCard/card';

  $margin: 16px;

  .card {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-block;
    width: 100%;
    height: 256px;
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
    max-width: calc(100% - 320px);
    margin: 24px;
    vertical-align: top;
  }

  .text {
    padding-bottom: 6px;
    font-size: 14px;
  }

  .metadata-info {
    margin-bottom: 6px;
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
    vertical-align: top;
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
    height: 130px;
    margin-left: 24px;
  }

  .footer-icon {
    display: block;
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
