<template>

  <div
    class="card container drop-shadow"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <router-link
      :to="to"
      class="card card-link"
      :class="[isMobile ? 'mobile-card' : '', $computedClass({ ':focus': $coreOutline })]"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <div
        class="card"
        :style="{ backgroundColor: $themeTokens.surface }"
      >
        <KFixedGrid numCols="4">
          <KFixedGridItem
            :span="isMobile ? 4 : 1"
            class="thumb-area"
          >
            <CardThumbnail
              :contentNode="contentNode"
              :hideDuration="!windowIsLarge"
            />
          </KFixedGridItem>

          <KFixedGridItem
            :span="isMobile ? 4 : 3"
            class="text-area"
          >
            <span :style="{ color: $themeTokens.text }">
              <div
                class="metadata-info"
                :style="{ color: $themePalette.grey.v_800 }"
              >
                <LearningActivityLabel
                  :contentNode="contentNode"
                  :hideDuration="true"
                  labelAfter
                  condensed
                />
              </div>
              <h3 :style="{ marginTop: '4px', marginBottom: '4px' }">
                <KTextTruncator
                  :text="contentNode.title"
                  :maxLines="1"
                />
              </h3>
              <p
                v-if="contentNode.description"
                style="margin-top: 4px; margin-bottom: 4px; font-size: 14px"
              >
                <KTextTruncator
                  :text="contentNode.description"
                  :maxLines="2"
                />
              </p>
              <div
                v-if="!isMobile"
                class="bottom-items"
              >
                <LearningActivityDuration
                  v-if="!windowIsLarge"
                  :contentNode="contentNode"
                  :class="categoryAndLevelString ? 'duration prepends' : 'duration'"
                  condensed
                  :style="{ color: $themePalette.grey.v_800, marginTop: 0 }"
                />
                <p
                  v-if="categoryAndLevelString"
                  class="metadata-info"
                  :style="{ color: $themePalette.grey.v_800, marginTop: 0 }"
                >
                  {{ categoryAndLevelString }}
                </p>
                <div>
                  <img
                    v-if="channelThumbnail"
                    :src="channelThumbnail"
                    :alt="learnString('logo', { channelTitle: channelTitle })"
                    class="channel-logo"
                    :style="{ color: $themePalette.grey.v_800 }"
                    loading="lazy"
                  >
                  <p
                    v-else
                    class="metadata-info"
                    :style="{ color: $themePalette.grey.v_800, marginTop: 0 }"
                  >
                    {{ learnString('logo', { channelTitle: channelTitle }) }}
                  </p>
                  <KButton
                    v-if="contentNode.copies"
                    appearance="basic-link"
                    class="copies"
                    :style="{ color: $themeTokens.text }"
                    :text="coreString('copies', { num: contentNode.copies.length })"
                    @click.prevent="$emit('openCopiesModal', contentNode.copies)"
                  />
                </div>
              </div>
            </span>
            <p
              v-if="createdDate"
              class="created-info"
              :style="{ color: $themePalette.grey.v_800 }"
            >
              {{ bookmarkCreated }}
            </p>
          </KFixedGridItem>
        </KFixedGrid>
      </div>
    </router-link>
    <slot name="footer"></slot>
  </div>

</template>


<script>

  import { validateLinkObject } from 'kolibri/utils/validators';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { now } from 'kolibri/utils/serverClock';
  import { ContentLevels, Categories } from 'kolibri/constants';
  import camelCase from 'lodash/camelCase';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useChannels from 'kolibri-common/composables/useChannels';
  import LearningActivityLabel from './LearningActivityLabel';
  import LearningActivityDuration from './LearningActivityDuration';
  import commonLearnStrings from './commonLearnStrings';
  import CardThumbnail from './HybridLearningContentCard/CardThumbnail';

  export default {
    name: 'CardList',
    components: {
      CardThumbnail,
      LearningActivityLabel,
      LearningActivityDuration,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    setup() {
      const { getChannelThumbnail, getChannelTitle } = useChannels();
      const { windowIsLarge } = useKResponsiveWindow();
      return {
        getChannelThumbnail,
        getChannelTitle,
        windowIsLarge,
      };
    },
    props: {
      createdDate: {
        type: String,
        default: null,
      },
      contentNode: {
        type: Object,
        required: true,
      },
      to: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      isMobile: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      now: now(),
    }),
    computed: {
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
      categoryAndLevelString() {
        if (
          this.levels(this.contentNode.grade_levels) &&
          this.category(this.contentNode.categories)
        ) {
          return (
            this.category(this.contentNode.categories) +
            ' | ' +
            this.levels(this.contentNode.grade_levels)
          );
        } else if (this.category(this.contentNode.categories)) {
          return this.category(this.contentNode.categories);
        } else if (this.levels(this.contentNode.grade_levels)) {
          return this.levels(this.contentNode.grade_levels);
        }
        return null;
      },
      channelThumbnail() {
        return this.getChannelThumbnail(this.contentNode && this.contentNode.channel_id);
      },
      channelTitle() {
        return this.getChannelTitle(this.contentNode && this.contentNode.channel_id);
      },
    },
    methods: {
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
        }
      },
      category(options) {
        const matches = Object.keys(Categories)
          .sort()
          .filter(k => options.includes(Categories[k]));
        if (matches && matches.length > 0) {
          return matches.map(m => this.coreString(camelCase(m))).join(', ');
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  $footer-height: 36px;
  $h-padding: 24px;
  $v-padding: 16px;

  .drop-shadow {
    @extend %dropshadow-1dp;

    &:hover {
      @extend %dropshadow-6dp;
    }
  }

  .container {
    padding: $v-padding $h-padding;
    margin-top: $h-padding;
  }

  .card {
    position: relative;
    vertical-align: top;
    border-radius: 8px;
    transition: box-shadow $core-time ease;

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .card-link {
    display: block;
    width: 100%;
    text-decoration: none;
  }

  .metadata-info {
    display: inline-block;
    padding-left: 2px;
    font-size: 13px;
  }

  .channel-logo {
    display: inline-block;
    height: 24px;
    margin-right: 8px;
    font-size: 13px;
  }

  .copies {
    display: inline-block;
    padding: 8px;
    font-size: 13px;
    text-decoration: none;
    vertical-align: top;
  }

  .duration {
    display: inline-block;
    margin-top: 4px;
    font-size: 13px;
  }

  .prepends {
    &::after {
      content: ' | ';
    }
  }

  .created-info {
    font-size: 13px;
  }

  .bottom-items {
    margin-top: 8px;
  }

  .thumb-area {
    margin-bottom: 16px;
  }

  .details {
    max-width: 100%;
    margin-top: 240px;
  }

  .text-area {
    margin-bottom: $footer-height;
  }

</style>
