<template>

  <section class="metadata">
    <!-- placeholder for learning activity type chips TODO update with chip component -->
    <div v-if="content.activityType">
      Activity Type Chip(s) Here
    </div>
    <!-- placeholder for learning activity "for beginniners"
    new metadata TODO update with chip component  -->
    <div v-if="content.forBeginners">
      For Beginners Chip Here
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
    <p v-if="content.level">
      {{ $tr('level', { level: content.level }) }}
    </p>
    <p v-if="content.estimatedTime">
      {{ $tr('estimatedTime', { estimatedTime: content.estimatedTime }) }}
    </p>
    <p v-if="content.lang">
      {{ $tr('language', { language: content.lang.lang_name }) }}
    </p>
    <p v-if="content.author">
      {{ $tr('author', { author: content.author }) }}
    </p>
    <p v-if="content.license_owner">
      {{ $tr('copyrightHolder', { copyrightHolder: content.license_owner }) }}
    </p>
    <p v-if="licenseShortName">
      {{ $tr('license', { license: licenseShortName }) }}

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
        } else {
          this.showMoreOrLess = 'Show More';
          this.truncate = 'truncate-description';
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
      author: 'Author: {author}',
      language: 'Language: {language}',
      license: 'License: {license}',
      level: 'Level: {level}',
      estimatedTime: 'Estimated time: {estimatedTime}',
      toggleLicenseDescription: 'Toggle license description',
      copyrightHolder: 'Copyright holder: {copyrightHolder}',
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
    height: 170px;
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
