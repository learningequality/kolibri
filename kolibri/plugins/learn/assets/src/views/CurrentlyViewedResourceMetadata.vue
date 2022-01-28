<template>

  <section v-if="content" class="metadata">

    <div class="section">
      <span
        v-if="forBeginners"
        class="beginners-chip"
        :style="{
          backgroundColor: $themeBrand.secondary.v_600,
          color: $themeTokens.textInverted
        }"
        data-test="beginners-chip"
      >
        {{ coreString("ForBeginners") }}
      </span>
    </div>

    <div class="section">
      <ContentNodeThumbnail :contentNode="content" />
    </div>

    <div v-if="content.title" class="section title" data-test="content-title">
      {{ content.title }}
    </div>

    <div
      v-if="content.description"
      ref="description"
      class="content"
      :class="truncate"
      data-test="content-description"
    >
      {{ content.description }}
    </div>

    <KButton
      v-if="descriptionOverflow"
      :text="showMoreOrLess"
      appearance="flat-button"
      class="show-more-button"
      :primary="true"
      @click="toggleShowMoreOrLess"
    />

    <div v-if="content.level" class="section">
      <span class="label">
        {{ metadataStrings.$tr('level') }}:
      </span>
      <span>
        {{ content.level }}
      </span>
    </div>

    <div v-if="content.duration" class="section" data-test="estimated-time">
      <span class="label">
        {{ metadataStrings.$tr('estimatedTime') }}:
      </span>
      <span>
        <TimeDuration :seconds="content.duration" />
      </span>
    </div>

    <div
      v-if="content.grade_levels && content.grade_levels.length"
      class="section"
      data-test="grade-levels"
    >
      <span class="label">
        {{ metadataStrings.$tr('level') }}:
      </span>
      <span>
        {{ content.grade_levels.join(", ") }}
      </span>
    </div>

    <div v-if="content.lang" class="section" data-test="lang">
      <span class="label">
        {{ metadataStrings.$tr('language') }}:
      </span>
      <span>
        {{ content.lang.lang_name }}
      </span>
    </div>

    <div v-if="content.author" class="section" data-test="author">
      <span class="label">
        {{ metadataStrings.$tr('author') }}:
      </span>
      <span>
        {{ content.author }}
      </span>
    </div>

    <div v-if="content.license_owner" class="section" data-test="license-owner">
      <span class="label">
        {{ metadataStrings.$tr('copyrightHolder') }}:
      </span>
      <span>
        {{ content.license_owner }}
      </span>
    </div>

    <div v-if="licenseDescription" class="section" data-test="license-desc">
      <span class="label">
        {{ metadataStrings.$tr('license') }}:
      </span>
      <span>
        {{ licenseShortName || '' }}
        <KIconButton
          :icon="licenseDescriptionIsVisible ? 'chevronUp' : 'chevronDown'"
          :ariaLabel="metadataStrings.$tr('toggleLicenseDescription')"
          size="small"
          type="secondary"
          class="license-toggle"
          @click="licenseDescriptionIsVisible = !licenseDescriptionIsVisible"
        />
        <div v-if="licenseDescriptionIsVisible" class="license-details">
          <p class="license-details-name">
            {{ licenseLongName }}
          </p>
          <p>{{ licenseDescription }}</p>
        </div>
      </span>
    </div>

    <DownloadButton
      v-if="canDownload"
      :files="downloadableFiles"
      :nodeTitle="content.title"
      class="download-button"
      data-test="download-button"
    />

  </section>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { isEmbeddedWebView } from 'kolibri.utils.browserInfo';
  import LearnerNeeds from 'kolibri-constants/labels/Needs';
  import DownloadButton from 'kolibri.coreVue.components.DownloadButton';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import get from 'lodash/get';
  import {
    licenseShortName,
    licenseLongName,
    licenseDescriptionForConsumer,
  } from 'kolibri.utils.licenseTranslations';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import ContentNodeThumbnail from './thumbnails/ContentNodeThumbnail';
  import SidePanelResourceMetadata from './SidePanelResourceMetadata';

  export default {
    name: 'CurrentlyViewedResourceMetadata',
    components: {
      DownloadButton,
      ContentNodeThumbnail,
      TimeDuration,
    },
    mixins: [commonCoreStrings],
    props: {
      canDownloadContent: {
        type: Boolean,
        required: false,
        default: false,
      },
      content: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        licenseDescriptionIsVisible: false,
        showMoreOrLess: 'Show More',
        truncate: 'truncate-description',
        descriptionOverflow: false,
        metadataStrings: { $tr: () => null },
      };
    },
    computed: {
      forBeginners() {
        return get(this.content, 'learner_needs', []).includes(LearnerNeeds.FOR_BEGINNERS);
      },
      licenseShortName() {
        return licenseShortName(get(this, 'content.license_name', null));
      },
      licenseLongName() {
        return licenseLongName(get(this, 'content.license_name', null));
      },
      licenseDescription() {
        return licenseDescriptionForConsumer(
          get(this, 'content.license_name', null),
          get(this, 'content.license_description', null)
        );
      },
      downloadableFiles() {
        return this.content.files.filter(file => !file.preset.endsWith('thumbnail'));
      },
      canDownload() {
        if (this.canDownloadContent) {
          return (
            this.downloadableFiles.length &&
            this.content.kind !== ContentNodeKinds.EXERCISE &&
            !isEmbeddedWebView
          );
        }
        return false;
      },
    },
    mounted() {
      this.metadataStrings = crossComponentTranslator(SidePanelResourceMetadata);
      this.calculateDescriptionOverflow();
    },
    methods: {
      toggleShowMoreOrLess() {
        if (this.showMoreOrLess === 'Show More') {
          this.showMoreOrLess = 'Show Less';
          this.truncate = 'show-description';
          /* eslint-disable kolibri/vue-no-undefined-string-uses */
          return this.metadataStrings.$tr('showLess');
        } else {
          this.showMoreOrLess = 'Show More';
          this.truncate = 'truncate-description';
          return this.metadataStrings.$tr('showMore');
          /* eslint-enable kolibri/vue-no-undefined-string-uses */
        }
      },
      calculateDescriptionOverflow() {
        if (this.$refs.description && this.$refs.description.scrollHeight > 175) {
          this.descriptionOverflow = true;
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .truncate-description {
    width: 372px;
    max-height: 170px;
    margin-right: 32px;
    overflow-y: hidden;
    @media (max-width: 426px) {
      width: 300px;
    }
    @media (max-width: 320px) {
      width: 270px;
    }
  }

  .show-description {
    width: 372px;
    margin-right: 32px;
    @media (max-width: 426px) {
      width: 300px;
    }
    @media (max-width: 320px) {
      width: 270px;
    }
  }

  .show-more-button {
    margin-bottom: 16px;
    // -margin to align text vertically
    margin-left: -16px;
    text-decoration: underline;
  }

  .license-details-name {
    font-weight: bold;
  }

  .license-toggle {
    padding-top: 8px;
  }

  .download-button {
    margin-top: 16px;
  }

  .beginners-chip {
    display: inline-block;
    padding: 10px;
    font-weight: bold;
    border-radius: 4px;
  }

  .section {
    // hack to make margin-bottom apply to empty sections
    padding-right: 4px;
    padding-bottom: 16px;

    &.title {
      font-size: 1.25em;
      font-weight: bold;
    }

    .label {
      font-weight: bold;
    }
  }

  .content {
    font-size: 16px;
    line-height: 24px;
  }

  .related {
    .list-item {
      margin: 8px 0;
    }
  }

</style>
