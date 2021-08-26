<template>

  <div>

    <h1 class="visuallyhidden">
      {{ learnString('recommendedLabel') }}
    </h1>

    <KGrid>
      <KGridItem :layout12="{ span: 3 }">
        <div
          class="side-panel"
          :style="{
            color: $themeTokens.text,
            backgroundColor: $themeTokens.surface,
          }"
        >
          <KFixedGrid
            numCols="4"
            gutter="30"
          >
            <KFixedGridItem class="title">
              <h2>Keywords</h2>
            </KFixedGridItem>
            <SearchBox />
            <KFixedGridItem class="title">
              <h2>Categories</h2>
            </KFixedGridItem>
            <KFixedGridItem
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
            </KFixedGridItem>
            <!-- Filter by learning activity, displaying all options -->
            <KFixedGridItem class="title">
              <h2>Activities</h2>
            </KFixedGridItem>
            <KFixedGridItem
              span="2"
              alignment="center"
            >
              <KButton
                appearance="flat-button"
                :appearanceOverrides="customActivityStyles"
              >
                <KIcon icon="allActivities" class="activity-icon" />
                <p class="activity-button-text">
                  {{ learnString('all') }}
                </p>
              </KButton>
            </KFixedGridItem>
            <KFixedGridItem
              v-for="(value, activity) in learningActivitiesList"
              :key="activity"
              span="2"
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
            </KFixedGridItem>
            <KFixedGridItem>
              <KSelect
                :options="languageOptionsList"
                class="selector"
                :value="selectedLanguage"
              />
            </KFixedGridItem>
            <KFixedGridItem>
              <KSelect
                :options="contentLevelsList"
                class="selector"
                :value="selectedLevel"
              />
            </KFixedGridItem>
            <KFixedGridItem>
              <KSelect
                :options="channelOptionsList"
                class="selector"
                :value="selectedChannel"
              />
            </KFixedGridItem>
            <KFixedGridItem>
              <KSelect
                :options="accessibilityOptionsList"
                class="selector"
                :value="selectedAccessibilityFilter"
              />
            </KFixedGridItem>
            <KFixedGridItem
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
            </KFixedGridItem>
          </KFixedGrid>
        </div>

      </KGridItem>
      <KGridItem
        :layout12="{ span: 9 }"
      >
        <template v-if="popular.length">
          <ContentCardGroupHeader
            :header="learnString('mostPopularLabel')"
            :viewMorePageLink="popularPageLink"
            :showViewMore="popular.length > trimmedPopular.length"
          />
          <ContentCardGroupGrid
            v-if="windowIsSmall"
            :genContentLink="genContentLink"
            :contents="trimmedPopular"
          />
          <ContentCardGroupCarousel
            v-else
            :genContentLink="genContentLink"
            :contents="trimmedPopular"
          />
        </template>

        <template v-if="nextSteps.length">
          <ContentCardGroupHeader
            :header="learnString('nextStepsLabel')"
            :viewMorePageLink="nextStepsPageLink"
            :showViewMore="nextSteps.length > trimmedNextSteps.length"
          />
          <ContentCardGroupGrid
            v-if="windowIsSmall"
            :genContentLink="genContentLink"
            :contents="trimmedNextSteps"
          />
          <ContentCardGroupCarousel
            v-else
            :genContentLink="genContentLink"
            :contents="trimmedNextSteps"
          />
        </template>

        <template v-if="resume.length">
          <ContentCardGroupHeader
            :header="learnString('resumeLabel')"
            :viewMorePageLink="resumePageLink"
            :showViewMore="resume.length > trimmedResume.length"
          />
          <ContentCardGroupGrid
            v-if="windowIsSmall"
            :genContentLink="genContentLink"
            :contents="trimmedResume"
          />
          <ContentCardGroupCarousel
            v-else
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
  import languageSwitcherMixin from '../../../../../../kolibri/core/assets/src/views/language-switcher/mixin.js';
  import { PageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';
  import ContentCardGroupCarousel from './ContentCardGroupCarousel';
  import ContentCardGroupGrid from './ContentCardGroupGrid';
  import ContentCardGroupHeader from './ContentCardGroupHeader';
  import SearchBox from './SearchBox';
  // import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  const mobileCarouselLimit = 3;
  const desktopCarouselLimit = 15;

  export default {
    name: 'RecommendedPage',
    metaInfo() {
      return {
        title: this.learnString('learnLabel'),
      };
    },
    components: {
      ContentCardGroupCarousel,
      ContentCardGroupGrid,
      ContentCardGroupHeader,
      SearchBox,
    },
    mixins: [commonLearnStrings, languageSwitcherMixin, responsiveWindowMixin],
    computed: {
      ...mapState('recommended', ['nextSteps', 'popular', 'resume']),
      ...mapState('topicsRoot', { channels: 'rootNodes' }),
      carouselLimit() {
        return this.windowIsSmall ? mobileCarouselLimit : desktopCarouselLimit;
      },
      popularPageLink() {
        return {
          name: PageNames.RECOMMENDED_POPULAR,
        };
      },
      nextStepsPageLink() {
        return {
          name: PageNames.RECOMMENDED_NEXT_STEPS,
        };
      },
      resumePageLink() {
        return {
          name: PageNames.RECOMMENDED_RESUME,
        };
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
          width: '150px',
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
    },
  };

</script>


<style lang="scss" scoped>

  .side-panel {
    position: fixed;
    left: 0;
    z-index: 4;
    width: 354px;
    height: 100%;
    padding: 30px 40px;
    padding-bottom: 200px;
    margin-top: -32px;
    overflow: scroll;
    font-size: 14px;
    box-shadow: 0 3px 3px 0 #00000040;

    @media (min-width: 436px) {
      width: 436px;
    }
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

</style>
