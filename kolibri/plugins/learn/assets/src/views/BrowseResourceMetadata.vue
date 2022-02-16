<template>

  <section class="metadata">

    <div class="flex section">
      <div>
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

      <div>
        <KRouterLink
          ref="resourceButton"
          :text="metadataStrings.$tr('viewResource')"
          appearance="raised-button"
          :primary="false"
          :to="genContentLink(content.id, null, content.is_leaf, $route.name, { ...$route.query })"
          data-test="view-resource-link"
        />
      </div>
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
      data-test="content-description"
      class="content"
      :class="truncate"
    >
      {{ content.description }}
    </div>

    <KButton
      v-if="descriptionOverflow"
      :text="showMoreOrLess"
      appearance="basic-link"
      class="show-more-button"
      data-test="show-more-or-less"
      :primary="true"
      @click="toggleShowMoreOrLess"
    />
    <!-- this v-else ensures spacing remains consistent without show more -->
    <div v-else class="section"></div>

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

    <div v-if="accessibilityLabels" class="section" data-test="accessibility-labels">
      <span class="label">
        {{ coreString('accessibility') }}:
      </span>
      <span>
        {{ accessibilityLabels }}
      </span>
    </div>

    <div v-if="content.learner_needs" class="section" data-test="learner-needs">
      <span class="label">
        {{ metadataStrings.$tr('whatYouWillNeed') }}:
      </span>
      <span>
        {{ learnerNeedsLabels }}
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
          class="absolute-icon license-toggle"
          @click="licenseDescriptionIsVisible = !licenseDescriptionIsVisible"
        />
        <div v-if="licenseDescriptionIsVisible" class="license-details">
          <p class="license-details-name">
            {{ licenseLongName }}
          </p>
          <p style="margin-bottom: 0;">{{ licenseDescription }}</p>
        </div>
      </span>
    </div>

    <div v-if="recommendations" class="related section" data-test="recommendations">
      <div class="label">
        {{ coreString('related') }}:
      </div>
      <div class="list">
        <div
          v-for="related in recommendations"
          :key="related.title"
          class="list-item"
        >
          <KRouterLink :to="genContentLink(related.id, null, related.is_leaf, null, {})">
            <KLabeledIcon>
              <template #icon>
                <LearningActivityIcon :kind="related.learning_activities" />
              </template>
              {{ related.title }}
            </KLabeledIcon>
          </KRouterLink>
        </div>
      </div>
    </div>

    <div v-if="showLocationsInChannel && locationsInChannel" class="section" data-test="locations">
      <div class="label">
        {{
          metadataStrings
            .$tr('locationsInChannel', { 'channelname': (content.ancestors[0] || {}).title })
        }}:
      </div>
      <div v-for="location in locationsInChannel" :key="location.id">
        <div>
          <KRouterLink
            :to="genContentLink(lastAncestor(location).id, null, false, null, {})"
          >
            {{ lastAncestor(location).title }}
          </KRouterLink>
        </div>
      </div>
    </div>

  </section>

</template>


<script>

  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import get from 'lodash/get';
  import {
    licenseShortName,
    licenseLongName,
    licenseDescriptionForConsumer,
  } from 'kolibri.utils.licenseTranslations';
  import LearnerNeeds from 'kolibri-constants/labels/Needs';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import { ContentNodeResource } from 'kolibri.resources';
  import genContentLink from '../utils/genContentLink';
  import LearningActivityIcon from './LearningActivityIcon';
  import ContentNodeThumbnail from './thumbnails/ContentNodeThumbnail';
  import SidePanelResourceMetadata from './SidePanelResourceMetadata';

  export default {
    name: 'BrowseResourceMetadata',
    components: {
      LearningActivityIcon,
      TimeDuration,
      ContentNodeThumbnail,
    },
    mixins: [commonCoreStrings],
    props: {
      content: {
        type: Object,
        required: true,
      },
      showLocationsInChannel: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        licenseDescriptionIsVisible: false,
        showMoreOrLess: 'Show More',
        truncate: 'truncate-description',
        descriptionOverflow: false,
        metadataStrings: { $tr: () => null },
        recommendations: null,
        locationsInChannel: null,
      };
    },
    computed: {
      /**
       * Returns whether or not the LearnerNeeds.FOR_BEGINNERS constant is present in
       * this.content.learner_needs
       * @returns {Boolean}
       */
      forBeginners() {
        return get(this.content, 'learner_needs', []).includes(LearnerNeeds.FOR_BEGINNERS);
      },
      /**
       * Returns a list of this.content.learner_needs without the FOR_BEGINNERS key, if present
       * @returns {string[]}
       */
      learnerNeeds() {
        // Remove FOR_BEGINNERS in this list because it is indicated separately, above, if present
        return get(this.content, 'learner_needs', []).filter(
          need => need !== LearnerNeeds.FOR_BEGINNERS
        );
      },
      /**
       * Joins this.content.accessibility_labels with a comma & space for display purposes
       * @returns {string}
       */
      accessibilityLabels() {
        return this.content.accessibility_labels.map(label => this.coreString(label)).join(', ');
      },
      /**
       * Joins this.learnerNeeds with a comma & space for display purposes
       * @returns {string}
       */
      learnerNeedsLabels() {
        return this.learnerNeeds.map(label => this.coreString(label)).join(', ');
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
    },
    mounted() {
      ContentNodeResource.fetchRecommendationsFor(this.content.id).then(recommendations => {
        const threeRecs = recommendations.splice(0, 3);
        this.recommendations = threeRecs.length ? threeRecs : null;
      });

      if (this.showLocationsInChannel) {
        // Retreives any topics in this same channel
        ContentNodeResource.fetchCollection({
          getParams: { content_id: this.content.content_id, channel_id: this.content.channel_id },
        }).then((locations = []) => {
          locations = locations.filter(loc => loc.id !== this.content.id);
          if (locations && locations.length) {
            this.locationsInChannel = locations;
          }
        });
      }

      this.metadataStrings = crossComponentTranslator(SidePanelResourceMetadata);
      this.calculateDescriptionOverflow();
    },
    methods: {
      genContentLink,
      lastAncestor(location) {
        const lastAncestor = location.ancestors[location.ancestors.length - 1];
        return lastAncestor;
      },
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
      /**
       * @public
       * Determines and calls first focusable element for FocusTrap
       */
      focusFirstEl() {
        this.$refs.resourceButton.$el.focus();
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
    border-radius: 4px;
  }

  .section {
    position: relative;
    padding-right: 4px;
    padding-bottom: 16px;

    &.title {
      font-size: 1.25em;
      font-weight: bold;
    }

    &.flex {
      display: flex;
      justify-content: space-between;
    }

    .label {
      font-weight: bold;
    }
  }

  /* The KIconButton is just a bit larger than the space we
    have vertically, so it affected spacing between items. By
    positioning it absolutely, we put it where it belongs visually
    but strip it of the power to affect anything else's spacing.
    */
  .absolute-icon {
    position: absolute;
    top: -6px;
    margin-left: 8px;
  }

  .content {
    font-size: 16px;
    line-height: 24px;
  }

  .related {
    .list-item {
      padding-left: 4px;
      margin: 8px 0;
    }
  }

</style>
