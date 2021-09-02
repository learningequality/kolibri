<template>

  <div>
    <KGrid
      class="main-content-grid"
    >
      <KGridItem
        :layout="{ span: 3 }"
        :style="{
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
        }"
        class="side-panel"
      >
        <div>
          <h2 class="title">
            Keywords
          </h2>
          <SearchBox />
          <h2 class="title">
            Categories
          </h2>
          <div
            v-for="(value, category) in libraryCategoriesList"
            :key="category"
            span="4"
            class="category-list-item"
          >
            <KButton
              :text="value"
              appearance="flat-button"
              :appearanceOverrides="customCategoryStyles"
              iconAfter="chevronRight"
            />
          </div>
          <!-- Filter by learning activity, displaying all options -->
          <h2 class="title">
            Activities
          </h2>
          <KButton
            appearance="flat-button"
            :appearanceOverrides="customActivityStyles"
          >
            <KIcon icon="allActivities" class="activity-icon" />
            <p class="activity-button-text">
              {{ learnString('all') }}
            </p>
          </KButton>
          <span
            v-for="(value, activity) in learningActivitiesList"
            :key="activity"
            alignment="center"
          >
            <KButton
              appearance="flat-button"
              :appearanceOverrides="customActivityStyles"
            >
              <KIcon :icon="`${value + 'Shaded'}`" class="activity-icon" />
              <p class="activity-button-text">
                {{ learnString(value) }}
              </p>
            </KButton>
          </span>
          <KSelect
            :options="languageOptionsList"
            class="selector"
            :value="selectedLanguage"
          />
          <KSelect
            :options="contentLevelsList"
            class="selector"
            :value="selectedLevel"
          />
          <KSelect
            :options="channelOptionsList"
            class="selector"
            :value="selectedChannel"
          />
          <KSelect
            :options="accessibilityOptionsList"
            class="selector"
            :value="selectedAccessibilityFilter"
          />
          <div
            v-for="(value, activity) in resourcesNeededList"
            :key="activity"
            span="4"
            alignment="center"
          >
            <KCheckbox
              key="adHocLearners"
              :checked="isSelected"
              :label="value"
              @change="$emit('toggleSelected', $event)"
            />
          </div>
        </div>
      </KGridItem>
      <KGridItem
        class="card-grid"
        :layout="{ span: 8 }"
      >
        <ChannelCardGroupGrid
          v-if="channels.length"
          class="grid"
          :contents="channels"
          :genContentLink="genChannelLink"
        />
        <h2>Recent</h2>
        <ContentCardGroupGrid
          v-if="popular.length"
          :genContentLink="genContentLink"
          :contents="trimmedPopular"
        />

        <template v-if="nextSteps.length">
          <ContentCardGroupGrid
            :genContentLink="genContentLink"
            :contents="trimmedNextSteps"
          />
        </template>

        <template v-if="resume.length">
          <ContentCardGroupGrid
            :genContentLink="genContentLink"
            :contents="trimmedResume"
          />
        </template>
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import uniq from 'lodash/uniq';

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import {
    LearningActivities,
    LibraryCategories,
    ResourcesNeededTypes,
    ContentLevels,
    AccessibilityCategories,
  } from 'kolibri.coreVue.vuex.constants';
  import { ContentNodeProgressResource } from 'kolibri.resources';
  import languageSwitcherMixin from '../../../../../core/assets/src/views/language-switcher/mixin.js';
  import { PageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';
  import ChannelCardGroupGrid from './ChannelCardGroupGrid';
  import ContentCardGroupGrid from './ContentCardGroupGrid';
  import SearchBox from './SearchBox';

  // import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  const mobileCarouselLimit = 3;
  const desktopCarouselLimit = 15;

  export default {
    name: 'LibraryPage',
    metaInfo() {
      return {
        title: this.learnString('learnLabel'),
      };
    },
    components: {
      ContentCardGroupGrid,
      ChannelCardGroupGrid,
      SearchBox,
    },
    mixins: [commonLearnStrings, languageSwitcherMixin, responsiveWindowMixin],
    computed: {
      ...mapState('recommended', ['nextSteps', 'popular', 'resume']),
      ...mapState('topicsRoot', { channels: 'rootNodes' }),
      carouselLimit() {
        return this.windowIsSmall ? mobileCarouselLimit : desktopCarouselLimit;
      },
      trimmedPopular() {
        return this.popular.slice(0, this.carouselLimit);
      },
      trimmedNextSteps() {
        return this.nextSteps.slice(0, this.carouselLimit);
      },
      trimmedResume() {
        return this.resume.slice(0, this.carouselLimit);
      },
      isSelected() {
        return false;
      },
      learningActivitiesList() {
        let learningActivites = {};
        Object.keys(LearningActivities)
          // remove topic folder, since it is not actually an activity itself
          .filter(key => key !== 'TOPIC')
          .map(key => {
            // map 'interact' KDS icon to new 'explore' wording
            if (LearningActivities[key] === 'explore') {
              LearningActivities[key] = 'interact';
            }
            learningActivites[key] = LearningActivities[key];
          });
        return learningActivites;
      },
      libraryCategoriesList() {
        let libraryCategories = {};
        Object.keys(LibraryCategories).map(key => {
          // map 'interact' KDS icon to new 'explore' wording
          let newValue = LibraryCategories[key].replace('_', ' ');
          libraryCategories[key] = newValue;
        });
        return libraryCategories;
      },
      resourcesNeededList() {
        let resourcesNeeded = {};
        Object.keys(ResourcesNeededTypes).map(key => {
          let newValue =
            ResourcesNeededTypes[key].charAt(0).toUpperCase() + ResourcesNeededTypes[key].slice(1);
          newValue = newValue.split('_').join(' ');
          resourcesNeeded[key] = newValue;
        });
        return resourcesNeeded;
      },
      languageOptionsList() {
        return this.languageOptions.map(lang => lang.lang_name);
      },
      accessibilityOptionsList() {
        let accessibilityOptionsList = [];
        Object.keys(AccessibilityCategories).map(key => {
          let newValue =
            AccessibilityCategories[key].charAt(0).toUpperCase() +
            AccessibilityCategories[key].slice(1);
          newValue = newValue.split('_').join(' ');
          accessibilityOptionsList.push(newValue);
        });
        return accessibilityOptionsList;
      },
      contentLevelsList() {
        let contentLevelsList = [];
        Object.keys(ContentLevels).map(key => {
          let newValue = ContentLevels[key].charAt(0).toUpperCase() + ContentLevels[key].slice(1);
          newValue = newValue.split('_').join(' ');
          contentLevelsList.push(newValue);
        });
        return contentLevelsList;
      },
      channelOptionsList() {
        let channelList = [];
        if (this.channels) {
          this.channels.forEach(channel => {
            channelList.push(channel.title);
          });
        }
        return channelList;
      },
      selectedLanguage() {
        return this.languageOptionsList.find(o => o.value === this.value) || {};
      },
      selectedAccessibilityFilter() {
        return this.accessibilityOptionsList.find(o => o.value === this.value) || {};
      },
      selectedLevel() {
        return this.contentLevelsList.find(o => o.value === this.value) || {};
      },
      selectedChannel() {
        return this.channelOptionsList.find(o => o.value === this.value) || {};
      },
      customCategoryStyles() {
        return {
          color: this.$themeTokens.text,
          width: '100%',
          border: '2px solid transparent',
          'text-transform': 'capitalize',
          'text-align': 'left',
          'font-weight': 'normal',
          transition: 'none',
          ':hover': {
            'background-color': 'rgb(235, 210, 235)',
            border: '2px',
            'border-color': '#996189',
            'border-style': 'solid',
            'border-radius': '4px',
            'line-spacing': '0',
          },
          '/deep/ .prop-icon': {
            float: 'right',
          },
        };
      },
      customActivityStyles() {
        return {
          color: this.$themeTokens.text,
          width: '140px',
          height: '100px',
          border: '2px solid transparent',
          'text-transform': 'capitalize',
          'text-align': 'center',
          'font-weight': 'normal',
          transition: 'none',
          ':hover': {
            'background-color': 'rgb(235, 210, 235)',
            border: '2px',
            'border-color': '#996189',
            'border-style': 'solid',
            'border-radius': '4px',
            'line-spacing': '0',
          },
        };
      },
    },
    created() {
      if (this.$store.getters.isUserLoggedIn) {
        const contentNodeIds = uniq(
          [...this.trimmedNextSteps, ...this.trimmedPopular, ...this.trimmedResume].map(
            ({ id }) => id
          )
        );

        if (contentNodeIds.length > 0) {
          ContentNodeProgressResource.fetchCollection({ getParams: { ids: contentNodeIds } }).then(
            progresses => {
              this.$store.commit('recommended/SET_RECOMMENDED_NODES_PROGRESS', progresses);
            }
          );
        }
      }
    },
    methods: {
      genContentLink(id, isLeaf) {
        return {
          name: isLeaf ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
          params: { id },
          query: {
            last: this.$store.state.pageName,
          },
        };
      },
      genChannelLink(channel_id) {
        return {
          name: PageNames.TOPICS_CHANNEL,
          params: { channel_id },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .side-panel {
    height: 100%;
    padding: 30px 40px !important;
    padding-bottom: 120px !important;
    overflow: scroll;
    font-size: 14px;
    box-shadow: 0 3px 3px 0 #00000040;
  }

  .activity-icon {
    width: 34px;
    height: 34px;
  }

  .activity-button-text {
    padding: 0;
    margin: 0;
  }

  .selector {
    padding-top: 10px;
    background-color: rgba(189, 189, 189, 0.25);
    border-radius: 2px;

    /deep/ .ui-select-display-value {
      margin-left: 10px;
    }

    /deep/ .ui-icon {
      margin-right: 10px;
    }
  }

  .card-grid {
    margin-top: 40px;
    margin-left: 20px;
  }

</style>
