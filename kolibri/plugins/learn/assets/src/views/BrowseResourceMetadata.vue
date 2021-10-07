<template>

  <!-- For the sidebar when browsing all content -->

  <section class="metadata">
    <!-- placeholder for learning activity type chips TODO update with chip component -->

    <!-- Whatever data will come in this place may be an array? -->
    <div class="chips section">
      <LearningActivityChip v-if="content.activityKind" :kind="content.activityKind" />
    </div>

    <div class="flex section">
      <!-- Wrapping each flex child content in the plain div keeps them flex-spaced
        properly even when one isn't there -->
      <div>
        <span
          v-if="content.forBeginners"
          class="beginners-chip"
        >
          {{ coreString("ForBeginners") }}
        </span>
      </div>

      <div>
        <KRouterLink
          :text="metadataStrings.$tr('viewResource')"
          appearance="raised-button"
          :primary="false"
          :to="genContentLink(content.id, content.is_leaf)"
        />
      </div>
    </div>

    <div class="section">
      <Thumbnail :thumbnailUrl="content.thumbnail" />
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
      appearance="basic-link"
      class="show-more-button"
      :primary="true"
      @click="toggleShowMoreOrLess"
    />
    <!-- this v-else ensures spacing remains consistent without show more -->
    <div v-else class="section"></div>

    <!-- TODO No "Subject" string available - but it is noted in Figma as a possible metadata
    <div v-if="content.subject" class="section">
      <span class="label">
      </span>
      <span>
      </span>
    </div>
    -->

    <div v-if="content.level" class="section">
      <span class="label">
        {{ metadataStrings.$tr('level') }}:
      </span>
      <span>
        {{ content.level }}
      </span>
    </div>

    <div v-if="content.duration" class="section">
      <span class="label">
        {{ metadataStrings.$tr('estimatedTime') }}:
      </span>
      <span>
        <TimeDuration :seconds="content.duration" />
      </span>
    </div>

    <div v-if="content.lang" class="section">
      <span class="label">
        {{ metadataStrings.$tr('language') }}:
      </span>
      <span>
        {{ content.lang.lang_name }}
      </span>
    </div>

    <div v-if="content.accessibility" class="section">
      <span class="label">
        {{ coreString('accessibility') }}:
      </span>
      <span>
        {{ content.accessibility }}
      </span>
    </div>

    <div v-if="content.whatYouWillNeed" class="section">
      <span class="label">
        {{ metadataStrings.$tr('whatYouWillNeed') }}:
      </span>
      <span>
        {{ content.whatYouWillNeed }}
      </span>
    </div>

    <div v-if="content.author" class="section">
      <span class="label">
        {{ metadataStrings.$tr('author') }}:
      </span>
      <span>
        {{ content.author }}
      </span>
    </div>

    <div v-if="content.license_owner" class="section">
      <span class="label">
        {{ metadataStrings.$tr('copyrightHolder') }}:
      </span>
      <span>
        {{ content.license_owner }}
      </span>
    </div>

    <div v-if="licenseDescription" class="section">
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
        <div v-if="licenseDescriptionIsVisible" dir="auto" class="license-details">
          <p class="license-details-name">
            {{ licenseLongName }}
          </p>
          <p>{{ licenseDescription }}</p>
        </div>
      </span>
    </div>

    <div v-if="content.related" class="section">
      <div class="label">
        {{ coreString('related') }}:
      </div>
      <ul class="list">
        <li
          v-for="related in content.related"
          :key="related.title"
          class="list-item"
        >
          <KLabeledIcon :icon="related.activityKind">
            {{ related.title }}
          </KLabeledIcon>
        </li>
      </ul>
    </div>

    <div v-if="content.locations" class="section">
      <div class="label">
        {{ metadataStrings.$tr('locationsInChannel', { 'channelName': content.parent.title }) }}:
      </div>
      <ul class="list">
        <li
          v-for="location in content.locations"
          :key="location.title"
          class="list-item"
        >
          {{ location.title }}
        </li>
      </ul>
    </div>

  </section>

</template>


<script>

  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import {
    licenseShortName,
    licenseLongName,
    licenseDescriptionForConsumer,
  } from 'kolibri.utils.licenseTranslations';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import genContentLink from '../utils/genContentLink';
  import LearningActivityChip from './LearningActivityChip';
  import Thumbnail from './thumbnails/Thumbnail';
  import SidePanelResourceMetadata from './SidePanelResourceMetadata';

  export default {
    name: 'BrowseResourceMetadata',
    components: {
      LearningActivityChip,
      TimeDuration,
      Thumbnail,
    },
    mixins: [commonCoreStrings],
    props: {
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
    },
    mounted() {
      this.metadataStrings = crossComponentTranslator(SidePanelResourceMetadata);
      this.calculateDescriptionOverflow();
    },
    methods: {
      genContentLink,
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
    margin-top: 4px;
    margin-bottom: 16px;
    font-weight: bold;
    text-transform: uppercase;
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
    color: white;
    background: #328168; // brand.secondary.v_600
    border-radius: 4px;
  }

  .section {
    padding-right: 4px;
    padding-bottom: 16px;

    &.title {
      font-size: 1.25em;
      font-weight: bold;
    }

    &.chips {
      display: flex;
      flex-wrap: wrap;
      max-width: 426px;
      // Ensures space on line w/ closing X icon whether
      // chips are visible or not
      min-height: 40px;
    }

    &.flex {
      display: flex;
      justify-content: space-between;
    }

    .label {
      font-weight: bold;
    }

    /deep/ .activity-chip {
      margin: 4px;
    }
  }

  .content {
    font-size: 16px;
    line-height: 24px;
  }

</style>
