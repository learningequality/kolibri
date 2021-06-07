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
    <h2 v-if="content.title">
      {{ content.title }}
    </h2>
    <p v-if="content.description">
      {{ content.description }}
    </p>
    <p v-if="content.level">
      <b>{{ $tr('level') }}:</b> {{ content.level }}
    </p>
    <p v-if="content.estimatedTime">
      <b>{{ $tr('estimatedTime') }}:</b> {{ content.estimatedTime }}
    </p>
    <p v-if="content.lang">
      <b>{{ $tr('language') }}:</b> {{ content.lang.lang_name }}
    </p>
    <p v-if="content.author">
      <b>{{ $tr('author') }}:</b> {{ content.author }}
    </p>
    <p v-if="content.license_owner">
      <b>{{ $tr('copyrightHolder') }}:</b> {{ content.license_owner }}
    </p>
    <p v-if="licenseShortName">
      <b>{{ $tr('license') }}:</b> {{ licenseShortName }}

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

  // import Backdrop from 'kolibri.coreVue.components.Backdrop';
  import { mapState, mapGetters } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { isEmbeddedWebView } from 'kolibri.utils.browserInfo';
  // import markdownIt from 'markdown-it';
  import DownloadButton from 'kolibri.coreVue.components.DownloadButton';
  import {
    licenseShortName,
    licenseLongName,
    licenseDescriptionForConsumer,
  } from 'kolibri.utils.licenseTranslations';

  export default {
    name: 'SidePanelResourceMetadata',
    components: {
      // Backdrop,
      DownloadButton,
    },
    data() {
      return {
        licenceDescriptionIsVisible: false,
      };
    },
    // watch: {
    // panelShown() {
    //   this.$nextTick(() => {
    //     if (isShown) {
    //       window.addEventListener('focus', this.containFocus, true);
    //       this.previouslyFocusedElement = document.activeElement;
    //       this.$refs.sideNav.focus();
    //     } else {
    //       window.removeEventListener('focus', this.containFocus, true);
    //       this.previouslyFocusedElement.focus();
    //     }
    //   });
    //   return true;
    // },
    // },
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
      // description() {
      //   if (this.content && this.content.description) {
      //     const md = new markdownIt({ breaks: true });
      //     return md.render(this.content.description);
      //   }
      //   return '';
      // },
    },
    // methods: {
    //   // togglePanel() {
    //   //   this.$emit('togglePanel');
    //   // },
    //   containFocus(event) {
    //     if (event.target === window) {
    //       return event;
    //     }
    //     if (!this.$refs.sidePanel.contains(event.target)) {
    //       this.$refs.coreMenu.$el.focus();
    //     }
    //     return event;
    //   },
    // },

    $trs: {
      author: 'Author',
      language: 'Language',
      license: 'License',
      level: 'Level',
      estimatedTime: 'Estimated time',
      toggleLicenseDescription: 'Toggle license description',
      copyrightHolder: 'Copyright holder',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .side-panel-wrapper {
    overflow-x: hidden;
  }

  .side-panel {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 16;
    font-size: 14px;
  }

  .side-panel-resource-description {
    left: 0;
    width: 372px;
    height: 171px;
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

  .metadata {
    margin: 32px;
  }

</style>
