<template>

  <section class="metadata">
    <!-- placeholder for learning activity type chips TODO update with chip component -->


    <!-- Whatever data will come in this place may be an array? -->
    <div class="section">
      <LearningActivityChip v-if="content.activityKind" :kind="content.activityKind" />
    </div>

    <!-- The key here is not set in stone -->
    <div class="section">
      <!-- For Beginners Chip Here -->
      <div v-if="content.forBeginners" class="beginners-chip">
        {{ coreString("ForBeginners") }}
      </div>
    </div>

    <div v-if="content.title" class="section title">
      {{ content.title }}
    </div>

    <div v-if="content.description" ref="description" class="content" :class="truncate">
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

    <!-- No "Subject" string available - but it is noted in Figma as a possible metadata
    <div v-if="content.subject" class="section">
      <span class="label">
      </span>
      <span>
      </span>
    </div>
    -->

    <div v-if="content.level" class="section">
      <span class="label">
        {{ $tr('level') }}:
      </span>
      <span>
        {{ content.level }}
      </span>
    </div>

    <div v-if="content.duration" class="section">
      <span class="label">
        {{ $tr('estimatedTime') }}:
      </span>
      <span>
        <TimeDuration :seconds="content.duration" />
      </span>
    </div>

    <div v-if="content.lang" class="section">
      <span class="label">
        {{ $tr('language') }}:
      </span>
      <span>
        {{ content.lang.lang_name }}
      </span>
    </div>

    <div v-if="content.author" class="section">
      <span class="label">
        {{ $tr('author') }}:
      </span>
      <span>
        {{ content.author }}
      </span>
    </div>

    <div v-if="content.license_owner" class="section">
      <span class="label">
        {{ $tr('copyrightHolder') }}:
      </span>
      <span>
        {{ content.license_owner }}
      </span>
    </div>

    <div v-if="licenseDescription" class="section">
      <span class="label">
        {{ $tr('license') }}:
      </span>
      <span>
        {{ licenseShortName || '' }}
        <KIconButton
          :icon="licenseDescriptionIsVisible ? 'chevronUp' : 'chevronDown'"
          :ariaLabel="$tr('toggleLicenseDescription')"
          size="small"
          type="secondary"
          class="license-toggle"
          @click="licenseDescriptionIsVisible = !licenseDescriptionIsVisible"
        />
        <div v-if="licenseDescriptionIsVisible" dir="auto" class="license-details">
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
    />

  </section>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { isEmbeddedWebView } from 'kolibri.utils.browserInfo';
  import DownloadButton from 'kolibri.coreVue.components.DownloadButton';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import {
    licenseShortName,
    licenseLongName,
    licenseDescriptionForConsumer,
  } from 'kolibri.utils.licenseTranslations';
  import LearningActivityChip from '../../../../../plugins/learn/assets/src/views/LearningActivityChip';

  export default {
    name: 'SidePanelResourceMetadata',
    components: {
      DownloadButton,
      LearningActivityChip,
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
      };
    },
    computed: {
      licenseShortName() {
        return licenseShortName(this.content.license_name);
      },
      licenseLongName() {
        return licenseLongName(this.content.license_name);
      },
      licenseDescription() {
        return licenseDescriptionForConsumer(
          this.content.license_name,
          this.content.license_description
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
      this.calculateDescriptionOverflow();
    },
    methods: {
      toggleShowMoreOrLess() {
        if (this.showMoreOrLess === 'Show More') {
          this.showMoreOrLess = 'Show Less';
          this.truncate = 'show-description';
          return this.$tr('showLess');
        } else {
          this.showMoreOrLess = 'Show More';
          this.truncate = 'truncate-description';
          return this.$tr('showMore');
        }
      },
      calculateDescriptionOverflow() {
        if (this.$refs.description.scrollHeight > 175) {
          console.log(this.$refs.description.scrollHeight);
          this.descriptionOverflow = true;
        }
      },
    },
    $trs: {
      author: {
        message: 'Author',
        context:
          'Indicates who is the author of that specific learning resource. For example, "Author: Learning Equality".',
      },
      license: {
        message: 'License',
        context:
          'Indicates the type of license of that specific learning resource. For example, "License: CC BY-NC-ND".\n',
      },
      toggleLicenseDescription: {
        message: 'Toggle license description',
        context:
          'Describes the arrow which a learner can select to view more information about the type of license that a resource has.',
      },
      copyrightHolder: {
        message: 'Copyright holder',
        context:
          'Indicates who holds the copyright of that specific learning resource. For example, "Copyright holder: Ubongo Media".',
      },
      language: 'Language',
      level: {
        message: 'Level',
        context: 'Refers to the level of education to which the resource is directed at.',
      },
      estimatedTime: {
        message: 'Estimated time',
        context: 'Refers to the expected time it will take the learner to complete a resource.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      documentTitle: {
        message: '{ contentTitle } - { channelTitle }',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      shareFile: {
        message: 'Share',
        context: 'Option to share a specific file from a learning resource.',
      },
      locationsInChannel: {
        message: 'Location in {channelname}',
        context:
          "When there are multiple instances of the same resource, learner can see their 'locations' (positions in the respective folders of the channel) at the bottom of the sidebar with all the metadata, when they select the resource in the Kolibri Library.",
      },
      viewResource: {
        message: 'View resource',
        context: 'Refers to a button where the user can view all the details for a resource.',
      },
      showMore: {
        message: 'Show more',
        context: '',
      },
      showLess: {
        message: 'Show less',
        context: '',
      },
      whatYouWillNeed: {
        message: 'What you will need',
        context: '',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
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
    padding: 12px;
    font-weight: bold;
    color: white;
    background: #328168; // brand.secondary.v_600
    border-radius: 4px;
  }

  .section {
    // hack to make margin-bottom apply to empty sections
    min-height: 1px;
    margin-bottom: 16px;

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

</style>
