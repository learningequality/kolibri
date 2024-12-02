<template>

  <section class="metadata">
    <div class="flex section">
      <div>
        <span
          v-if="forBeginners"
          class="beginners-chip"
          :class="$computedClass(chipStyle)"
          data-test="beginners-chip"
        >
          {{ coreString('forBeginners') }}
        </span>
      </div>

      <div>
        <KRouterLink
          ref="resourceButton"
          :text="learnString('viewResource')"
          appearance="raised-button"
          :primary="false"
          :to="genContentLinkKeepCurrentBackLink(content.id, content.is_leaf)"
          data-test="view-resource-link"
        />
      </div>
    </div>

    <div class="section">
      <ContentNodeThumbnail :contentNode="content" />
    </div>

    <div
      v-if="content.title"
      class="section title"
      data-test="content-title"
    >
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
    <div
      v-else
      class="section"
    ></div>

    <div
      v-if="content.duration"
      class="section"
      data-test="estimated-time"
    >
      <span class="label"> {{ learnString('estimatedTime') }}: </span>
      <span>
        <TimeDuration :seconds="content.duration" />
      </span>
    </div>

    <div
      v-if="content.grade_levels && content.grade_levels.length"
      class="section"
      data-test="grade-levels"
    >
      <span class="label"> {{ coreString('levelLabel') }}: </span>
      <span>
        {{ levels(content.grade_levels) }}
      </span>
    </div>

    <div
      v-if="content.lang"
      class="section"
      data-test="lang"
    >
      <span class="label"> {{ coreString('languageLabel') }}: </span>
      <span>
        {{ content.lang.lang_name }}
      </span>
    </div>

    <div
      v-if="accessibilityLabels"
      class="section"
      data-test="accessibility-labels"
    >
      <span class="label"> {{ coreString('accessibility') }}: </span>
      <span>
        {{ accessibilityLabels }}
      </span>
    </div>

    <div
      v-if="content.learner_needs"
      class="section"
      data-test="learner-needs"
    >
      <span class="label"> {{ learnString('whatYouWillNeed') }}: </span>
      <span>
        {{ learnerNeedsLabels }}
      </span>
    </div>

    <div
      v-if="content.author"
      class="section"
      data-test="author"
    >
      <span class="label"> {{ learnString('author') }}: </span>
      <span>
        {{ content.author }}
      </span>
    </div>

    <div
      v-if="content.license_owner"
      class="section"
      data-test="license-owner"
    >
      <span class="label"> {{ learnString('copyrightHolder') }}: </span>
      <span>
        {{ content.license_owner }}
      </span>
    </div>

    <div
      v-if="licenseDescription"
      class="section"
      data-test="license-desc"
    >
      <span class="label"> {{ learnString('license') }}: </span>
      <span>
        {{ licenseShortName || '' }}
        <KIconButton
          :icon="licenseDescriptionIsVisible ? 'chevronUp' : 'chevronDown'"
          :ariaLabel="learnString('toggleLicenseDescription')"
          size="small"
          type="secondary"
          class="absolute-icon license-toggle"
          @click="licenseDescriptionIsVisible = !licenseDescriptionIsVisible"
        />
        <div
          v-if="licenseDescriptionIsVisible"
          class="license-details"
        >
          <p class="license-details-name">
            {{ licenseLongName }}
          </p>
          <p style="margin-bottom: 0">{{ licenseDescription }}</p>
        </div>
      </span>
    </div>

    <div
      v-if="recommendations"
      class="related section"
      data-test="recommendations"
    >
      <div class="label">{{ coreString('related') }}:</div>
      <div class="list">
        <div
          v-for="related in recommendations"
          :key="related.title"
          class="list-item"
        >
          <KRouterLink :to="genContentLinkKeepCurrentBackLink(related.id, related.is_leaf)">
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

    <div
      v-if="showLocationsInChannel && locationsInChannel"
      class="section"
      data-test="locations"
    >
      <div class="label">
        {{
          learnString('locationsInChannel', { channelname: (content.ancestors[0] || {}).title })
        }}:
      </div>
      <div
        v-for="location in locationsInChannel"
        :key="location.id"
      >
        <div>
          <KRouterLink :to="genContentLinkKeepCurrentBackLink(lastAncestor(location).id, false)">
            {{ lastAncestor(location).title }}
          </KRouterLink>
        </div>
      </div>
    </div>

    <div
      v-if="canDownloadExternally"
      class="section"
      data-test="download"
    >
      <DownloadButton
        :files="content.files"
        :nodeTitle="content.title"
      />
    </div>
  </section>

</template>


<script>

  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import camelCase from 'lodash/camelCase';
  import { ContentLevels } from 'kolibri/constants';
  import DownloadButton from 'kolibri/components/DownloadButton';
  import get from 'lodash/get';
  import {
    licenseShortName,
    licenseLongName,
    licenseDescriptionForConsumer,
  } from 'kolibri/uiText/licenses';
  import LearnerNeeds from 'kolibri-constants/labels/Needs';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import useContentLink from '../composables/useContentLink';
  import commonLearnStrings from './commonLearnStrings';
  import ContentNodeThumbnail from './thumbnails/ContentNodeThumbnail';

  export default {
    name: 'BrowseResourceMetadata',
    components: {
      DownloadButton,
      LearningActivityIcon,
      TimeDuration,
      ContentNodeThumbnail,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      const { genContentLinkKeepCurrentBackLink } = useContentLink();
      return { genContentLinkKeepCurrentBackLink };
    },
    props: {
      content: {
        type: Object,
        required: true,
      },
      showLocationsInChannel: {
        type: Boolean,
        default: false,
      },
      canDownloadExternally: {
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
          need => need !== LearnerNeeds.FOR_BEGINNERS,
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
          get(this, 'content.license_description', null),
        );
      },
      chipStyle() {
        return {
          backgroundColor: this.$themeBrand.primary.v_400,
          color: this.$themeTokens.textInverted,
          '::selection': {
            color: this.$themeTokens.text,
          },
        };
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

      this.calculateDescriptionOverflow();
    },
    methods: {
      lastAncestor(location) {
        const lastAncestor = location.ancestors[location.ancestors.length - 1];
        return lastAncestor;
      },
      toggleShowMoreOrLess() {
        if (this.showMoreOrLess === 'Show More') {
          this.showMoreOrLess = 'Show Less';
          this.truncate = 'show-description';
          return this.learnString('showLess');
        } else {
          this.showMoreOrLess = 'Show More';
          this.truncate = 'truncate-description';
          return this.learnString('showMore');
        }
      },
      calculateDescriptionOverflow() {
        if (this.$refs.description && this.$refs.description.scrollHeight > 175) {
          this.descriptionOverflow = true;
        }
      },
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
        } else {
          return '-';
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
