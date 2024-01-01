<template>

  <div class="select-resource">
    <div v-if="loading">
      <KCircularLoader />
    </div>
    <div v-else>
      <h5
        class="title-style"
      >
        <KRouterLink
          :to="goBack"
        >
          <KIcon
            icon="back"
          />
        </KRouterLink>
        {{ selectFoldersOrExercises$() }}
      </h5>

      <div v-if="!isTopicIdSet && bookmarks.length">

        <p>{{ selectFromBookmarks$() }}</p>

        <div @click="lessonCardClicked">
          <KRouterLink
            :appearanceOverrides="{
              width: '100%',
              textDecoration: 'none',
              color: $themeTokens.text
            }"
            :to="getBookmarksLink"
          >
            <div :class="windowIsSmall ? 'mobile-bookmark-container' : 'bookmark-container'">
              <BookmarkIcon :class="windowIsSmall ? 'mobile-bookmark-icon' : ''" />
              <div :class="windowIsSmall ? 'mobile-text' : 'text'">
                <h3>{{ coreString('bookmarksLabel') }}</h3>
                <p>{{ numberOfSelectedBookmarks$({ count: bookmarks.length }) }}</p>
              </div>
            </div>
          </KRouterLink>
        </div>
      </div>

      <!-- <LessonsSearchFilters
        v-if="inSearchMode"
        v-model="filters"
        class="search-filters"
        :searchTerm="searchTerm"
        :searchResults="searchResults"
      /> -->

      <ResourceSelectionBreadcrumbs
        v-if="isTopicIdSet"
        :ancestors="ancestors"
        :channelsLink="channelsLink"
        :topicsLink="topicsLink"
      />

      <ContentCardList
        :contentList="contentList"
        :showSelectAll="true"
        :viewMoreButtonState="viewMoreButtonState"
        :selectAllChecked="false"
        :contentIsChecked="() => false"
        :contentHasCheckbox="() => true"
        :contentCardMessage="selectionMetadata"
        :contentCardLink="contentLink"
        @changeselectall="toggleTopicInWorkingResources"
        @change_content_card="toggleSelected"
        @moreresults="handleMoreResults"
      />
      <div class="bottom-navigation">
        <KGrid>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            {{ numberOfResources$({ count: channels.length }) }}
          </KGridItem>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <KButton
              :text="coreString('continueAction')"
              :primary="true"
              :disabled="false"
            />
          </KGridItem>
        </KGrid>
      </div>
    </div>
  </div>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import every from 'lodash/every';
  import { ref } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import pickBy from 'lodash/pickBy';
  import useKResponsiveWindow from 'kolibri-design-system/lib/useKResponsiveWindow';
  import { LessonsPageNames } from '../../../constants/lessonsConstants';
  import { PageNames } from '../../../constants';
  import BookmarkIcon from '../LessonResourceSelectionPage/LessonContentCard/BookmarkIcon.vue';
  import useExerciseResources from './../../../composables/useExerciseResources';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import LessonsSearchBox from './../LessonResourceSelectionPage/SearchTools/LessonsSearchBox.vue';
  import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';
  //import LessonContentCard from './../LessonResourceSelectionPage/LessonContentCard/index.vue';
  //import LessonsSearchFilters from './../LessonResourceSelectionPage/
  // SearchTools/LessonsSearchFilters';
  import ResourceSelectionBreadcrumbs from './../LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs.vue';

  export default {
    name: 'ResourceSelection',
    components: {
      LessonsSearchBox,
      // BookMarkedResource,
      ContentCardList,
      BookmarkIcon,
      // ResourceSelection,
      ResourceSelectionBreadcrumbs,
      // LessonContentCard,
      // LessonsSearchFilters,
    },
    mixins: [commonCoreStrings],
    setup() {
      const {
        sectionSettings$,
        selectFromBookmarks$,
        numberOfSelectedBookmarks$,
        selectFoldersOrExercises$,
        numberOfSelectedResources$,
        numberOfResources$,
      } = enhancedQuizManagementStrings;

      const viewMoreButtonState = ref('no_more_results');

      const { windowIsSmall } = useKResponsiveWindow();

      const { initializeExerciseResources, channels, loading, bookmarks, setCurrentTopicId, contentList } = useExerciseResources();

      initializeExerciseResources();

      return {
        loading,
        setCurrentTopicId,
        contentList,
        sectionSettings$,
        selectFromBookmarks$,
        numberOfSelectedBookmarks$,
        selectFoldersOrExercises$,
        numberOfSelectedResources$,
        numberOfResources$,
        windowIsSmall,
        bookmarks,
        channels,
        viewMoreButtonState,
      };
    },
    computed: {
      filteredContentList() {
        const { role } = this.filters;
        if (!this.inSearchMode) {
          return this.channels;
        }

        return this.channels.filter(contentNode => {
          let passesFilters = true;
          if (role === 'nonCoach') {
            passesFilters = passesFilters && contentNode.num_coach_contents === 0;
          }
          if (role === 'coach') {
            passesFilters = passesFilters && contentNode.num_coach_contents > 0;
          }
          return passesFilters;
        });
      },
      inSearchMode() {
        return this.pageName === PageNames.SELECT_FROM_RESOURCE;
      },
      isTopicIdSet() {
        return this.$route.params.topic_id;
      },
      // inputPlaceHolderStyle() {
      //   return {
      //     color: this.$themeTokens.annotation,
      //   };
      // },
      selectAllIsVisible() {
        return false;
        // Do not show 'Select All' if on Search Results, on Channels Page,
        // or if all contents are topics
        /*
        return (
          !this.inSearchMode &&
          this.pageName !== LessonsPageNames.SELECTION_ROOT &&
          !every(this.channels.value, this.contentIsDirectoryKind)
        );
        */
      },
      contentIsInLesson() {
        return ({ id }) =>
          Boolean(
            this.channels
          );
      },
      selectionMetadata(/*content*/) {
        return function() {};
        // let count = 0;
        // let total = 0;
        // if (this.ancestorCounts[content.id]) {
        //   count = this.ancestorCounts[content.id].count;
        //   total = this.ancestorCounts[content.id].total;
        // }
        // if (count) {
        //   return this.$tr('selectionInformation', {
        //     count,
        //     total,
        //   });
        // }
        // return '';
        // return function() {
        //   console.log('Dynamic function called');
        // };
      },
      addableContent() {
        // Content in the topic that can be added if 'Select All' is clicked
        const list = this.contentList.value ? this.contentList.value : this.bookmarksList;
        return list.filter(
          content => !this.contentIsDirectoryKind(content) && !this.contentIsInLesson(content)
        );
      },
      goBack() {
        return {
          name: PageNames.QUIZ_SECTION_EDITOR,
          params: {
            section_id: this.$route.params.section_id,
          },
        };
      },
      getBookmarksLink() {
        return {
          name: PageNames.BOOK_MARKED_RESOURCES,
          params: {
            section_id: this.$route.params.section_id,
          },
        };
      },
      channelsLink() {
        return this.selectionRootLink();
      },
    },

    watch: {
      workingResources(newVal, oldVal) {
        this.showResourcesDifferenceMessage(newVal.length - oldVal.length);
        this.debouncedSaveResources();
      },
      bookmarks(newVal, oldVal) {
        this.bookmarksCount = newVal.length;
      },
    },
    beforeRouteEnter(to, from, next) {
      if (to.params.topic_id) {
        next(vm => {
          vm.updateResource();
        });
      }
    },
    methods: {
      /** @public */
      focusFirstEl() {
        this.$refs.textbox.focus();
      },
      // selectionMetadata(content) {
      //   if (content.kind === ContentNodeKinds.TOPIC) {
      //     const count = content.exercises.filter(exercise =>
      //       Boolean(this.selectedExercises[exercise.id])
      //     ).length;
      //     if (count === 0) {
      //       return '';
      //     }
      //     const total = content.exercises.length;
      //     return this.$tr('total_number', { count, total });
      //   }
      //   return '';
      // },
      lessonCardClicked() {
        this.showChannels = false;
      },
      contentLink(content) {
        if (!content.is_leaf) {
          return {
            name: PageNames.SELECT_FROM_RESOURCE,
            params: {
              topic_id: content.id,
              classId: this.$route.params.classId,
              section_id: this.$route.params.section_id,
            },
          };
        }

        return {}; // or return {} if you prefer an empty object
      },
      handleSearchTerm(searchTerm) {
        const query = {
          last_id: this.$route.query.last_id || this.$route.params.topicId,
        };
        const lastPage = this.$route.query.last;
        if (lastPage) {
          query.last = lastPage;
        }
        this.$router.push({
          name: LessonsPageNames.SELECTION_SEARCH,
          params: {
            searchTerm,
          },
          query,
        });
      },
      handleMoreResults() {
        this.moreResultsState = 'waiting';
        this.fetchAdditionalSearchResults({
          searchTerm: this.searchTerm,
          kind: this.filters.kind,
          channelId: this.filters.channel,
          currentResults: this.searchResults.results,
        })
          .then(() => {
            this.moreResultsState = null;
            this.moreResultsState;
          })
          .catch(() => {
            this.moreResultsState = 'error';
          });
      },
      selectionRootLink() {
        return this.$router.getRoute(PageNames.SELECT_FROM_RESOURCE, {}, this.$route.query);
      },
      toggleSelected({ content, checked }) {
        if (checked) {
          this.addToSelectedResources(content);
        } else {
          this.removeFromSelectedResources([content]);
        }
      },
      toggleTopicInWorkingResources(isChecked) {
        if (isChecked) {
          this.addableContent.forEach(resource => {
            this.addToResourceCache({
              node: { ...resource },
            });
          });
          this.addToWorkingResources(this.addableContent);
        } else {
          this.removeFromSelectedResources(this.channels.value);
        }
      },
      contentIsDirectoryKind({ is_leaf }) {
        return !is_leaf;
      },
      updateResource() {
        if (this.$route.params.topic_id) {
          this.setCurrentTopicId(this.$route.params.topic_id);
        } else {
          this.setCurrentTopicId(null);
        }
        this.setCurrentTopicId(this.$route.params.topic_id);
        /**
        this.fetchTopicResource(this.$route.params.topic_id).then(resource => {
          this.channels = resource.contentList;
          this.ancestors = resource.ancestors;
        });
        */
      },
      topicListingLink({ topicId }) {
        return this.$router.getRoute(
          PageNames.SELECT_FROM_RESOURCE,
          { topicId },
          this.$route.query
        );
      },
      topicsLink(topicId) {
        return this.topicListingLink({ ...this.$route.params, topicId });
      },
    },
    mounted() {
      if(this.$route.params.topic_id) {
        this.setCurrentTopicId(this.$route.params.topic_id);
      }
    },
    watch: {
      $route(to, from) {
        const to_topic_id = to.params.topic_id;
        if (to_topic_id && to.params.topic_id !== from.params.topic_id) {
          this.setCurrentTopicId(to.params.topic_id);
        } else {
          this.setCurrentTopicId(null);
        }
      },
    },

  };

</script>


<style scoped lang="scss">

  @import '~kolibri-design-system/lib/styles/definitions';

  .select-resource {
    margin-top: -4em;
  }

  .title-style {
    font-size: 1.4em;
    font-weight: 600;
  }

  .search-filters {
    margin-top: 24px;
  }

  .bookmark-container {
    display: flex;
    min-height: 141px;
    margin-bottom: 24px;
    border-radius: 2px;
    box-shadow: 0 1px 5px 0 #a1a1a1, 0 2px 2px 0 #e6e6e6, 0 3px 1px -2px #ffffff;
    transition: box-shadow 0.25s ease;
  }

  .mobile-bookmark-container {
    @extend %dropshadow-2dp;

    display: flex;
    max-width: 100%;
    min-height: 141px;
    margin: auto;
    margin-bottom: 24px;
    border-radius: 2px;

    .ease:hover {
      @extend %dropshadow-8dp;
      @extend %md-decelerate-func;

      transition: all $core-time;
    }
  }

  .mobile-bookmark-icon {
    left: 24px !important;
  }

  .mobile-text {
    margin-top: 20px;
    margin-left: 60px;
  }

  .bookmark-container:hover {
    box-shadow: 0 5px 5px -3px #a1a1a1, 0 8px 10px 1px #d1d1d1, 0 3px 14px 2px #d4d4d4;
  }

  .text {
    margin-left: 15rem;
  }

  .bottom-navigation {
    background-color: white;
    color: black;
    padding: 10px;
    position: fixed;
    bottom: 0;
    width: 50%;
    text-align: center;
  }

</style>

