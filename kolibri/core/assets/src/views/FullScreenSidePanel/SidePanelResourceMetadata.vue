<template>

  <section class="metadata">
    <!-- placeholder for learning activity type chips TODO update with chip component -->
    <div v-if="content.activityType">
      <!-- Activity Type Chip(s) Here -->
    </div>
    <!-- placeholder for learning activity "for beginniners"
    new metadata TODO update with chip component  -->
    <div v-if="content.forBeginners">
      <!-- For Beginners Chip Here -->
    </div>
    <div v-if="content.description" ref="description" :class="truncate">
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
    <dl>
      <dt v-if="content.level">
        {{ $tr('level') }}
      </dt>
      <dd>{{ content.level }}</dd>

      <dt v-if="content.estimatedTime">
        {{ $tr('estimatedTime') }}
      </dt>
      <dd>content.estimatedTime</dd>

      <dt v-if="content.lang">
        {{ $tr('language') }}
      </dt>
      <dd>{{ content.author }}</dd>
      <dt v-if="content.author">
        {{ $tr('author') }}
      </dt>
      <dd>{{ content.author }}</dd>
      <dd>{{ content.license_owner }}</dd>
      <dt v-if="content.license_owner">
        {{ $tr('copyrightHolder') }}
      </dt>
      <dd>{{ content.license_owner }}</dd>
    </dl>
    <p v-if="licenseShortName">
      {{ $tr('license') }}

      <template v-if="licenseDescription">
        <KIconButton
          :icon="licenceDescriptionIsVisible ? 'chevronUp' : 'chevronDown'"
          :ariaLabel="$tr('toggleLicenseDescription')"
          size="small"
          type="secondary"
          class="license-toggle"
          @click="licenceDescriptionIsVisible = !licenceDescriptionIsVisible"
        />
        <div v-if="licenceDescriptionIsVisible" dir="auto" class="license-details">
          <p class="license-details-name">
            {{ licenseLongName }}
          </p>
          <p>{{ licenseDescription }}</p>
        </div>
      </template>
    </p>
    <DownloadButton
      v-if="canDownload"
      :files="downloadableFiles"
      :nodeTitle="content.title"
      class="download-button"
    />
  </section>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { isEmbeddedWebView } from 'kolibri.utils.browserInfo';
  import DownloadButton from 'kolibri.coreVue.components.DownloadButton';
  import {
    licenseShortName,
    licenseLongName,
    licenseDescriptionForConsumer,
  } from 'kolibri.utils.licenseTranslations';

  export default {
    name: 'SidePanelResourceMetadata',
    components: {
      DownloadButton,
    },
    data() {
      return {
        licenceDescriptionIsVisible: false,
        showMoreOrLess: 'Show More',
        truncate: 'truncate-description',
        descriptionOverflow: false,
      };
    },
    computed: {
      ...mapGetters(['facilityConfig']),
      ...mapState('topicsTree', ['content']),
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
        if (this.facilityConfig.show_download_button_in_learn && this.content) {
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

  .metadata {
    margin: 32px;
  }

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
    padding: 0;
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

</style>
