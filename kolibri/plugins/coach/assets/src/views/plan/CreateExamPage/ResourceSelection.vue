<template>

  <div class="select-resource">
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
      Select folders or exercises from these channels
    </h5>
    <p>Select from bookmarks</p>

    <!-- <div v-if="bookmarksRoute">
      <strong>
        <KRouterLink>
          :text="coreString"('channelsLabel')"
          :to="channelsLink"
        </KRouterLink>
      </strong>
      <ContentCardList
        :contentList="bookmarksContentList"
        :showSelectAll="selectAllIsVisible"
        :selectAllChecked="addableContent.length === 0"
        :contentCardLink="bookmarkLink"
        :contentIsChecked="contentIsInLesson"
        :contentHasCheckbox="c => !contentIsDirectoryKind(c)"
        :viewMoreButtonState="viewMoreButtonState"
        :contentCardMessage="selectionMetadata"
        @changeselectall="toggleTopicInWorkingResources"
        @change_content_card="toggleSelected"
        @moreresults="handleMoreResults"
      />
    </div> -->
    <div>
      <div @click="lessonCardClicked">
        <KRouterLink
          v-if="bookmarksCount"
          :appearanceOverrides="{
            width: '100%',
            textDecoration: 'none',
            color: $themeTokens.text }"
          :to="getBookmarksLink()"
        >
          <div :class="windowIsSmall ? 'mobile-bookmark-container' : 'bookmark-container'">
            <BookmarkIcon :class="windowIsSmall ? 'mobile-bookmark-icon' : ''" />
            <div :class="windowIsSmall ? 'mobile-text' : 'text'">
              <h3>{{ coreString('bookmarksLabel') }}</h3>
              <p>{{ numberOfSelectedBookmarks$({ count: bookmarksCount }) }}</p>
            </div>
          </div>
        </KRouterLink>
      </div>
      <KGrid>
        <KGridItem :layout12="{ span: 6 }">
          <LessonsSearchBox @searchterm="handleSearchTerm" />
        </KGridItem>

        <!-- <KGridItem :layout12="{ span: 6, alignment: 'right' }">
          <p>
            {{ $tr('totalResourcesSelected', { total: workingResources.length }) }}
          </p>
        </KGridItem> -->
      </KGrid>

      <LessonsSearchFilters
        v-if="inSearchMode"
        v-model="filters"
        class="search-filters"
        :searchTerm="searchTerm"
        :searchResults="searchResults"
      />

      <!-- <ResourceSelectionBreadcrumbs
        v-if="!inSearchMode"
        :ancestors="ancestors"
        :channelsLink="channelsLink"
        :topicsLink="topicsLink"
      /> -->

      <ContentCardList
        v-if="!isExiting"
        :contentList="filteredContentList"
        :showSelectAll="selectAllIsVisible"
        :viewMoreButtonState="viewMoreButtonState"
        :selectAllChecked="addableContent.length === 0"
        :contentIsChecked="contentIsInLesson"
        :contentHasCheckbox="c => !contentIsDirectoryKind(c)"
        :contentCardMessage="selectionMetadata"
        :contentCardLink="contentLink"
        @changeselectall="toggleTopicInWorkingResources"
        @change_content_card="toggleSelected"
        @moreresults="handleMoreResults"
      />
    </div>
  </div>

</template>


<script>

  import { ContentNodeKinds, ContentNodeResource } from 'kolibri.coreVue.vuex.constants';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import every from 'lodash/every';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import pickBy from 'lodash/pickBy';
  import useKResponsiveWindow from 'kolibri-design-system/lib/useKResponsiveWindow';
  import { LessonsPageNames } from '../../../constants/lessonsConstants';
  import { PageNames } from '../../../constants';
  import BookmarkIcon from '../LessonResourceSelectionPage/LessonContentCard/BookmarkIcon.vue';
  import { useResources } from './../../../composables/useResources';
  import LessonsSearchBox from './../LessonResourceSelectionPage/SearchTools/LessonsSearchBox.vue';
  // import BookMarkedResource from './BookMarkedResource.vue';
  import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';
  // import LessonContentCard from './../LessonResourceSelectionPage/LessonContentCard/index.vue';
  import LessonsSearchFilters from './../LessonResourceSelectionPage/SearchTools/LessonsSearchFilters';
  // import  ResourceSelectionBreadcrumbs
  // from './../LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs.vue';

  export default {
    name: 'ResourceSelection',
    components: {
      LessonsSearchBox,
      // BookMarkedResource,
      ContentCardList,
      BookmarkIcon,
      // ResourceSelection,
      // ResourceSelectionBreadcrumbs,
      // LessonContentCard,
      LessonsSearchFilters,
    },
    inject: ['quizForge'],
    mixins: [commonCoreStrings],
    setup() {
      const { sectionSettings$, numberOfSelectedBookmarks$ } = enhancedQuizManagementStrings;
      const {
        bookmarks,
        channelTopics,
        channels,
        _getTopicsWithExerciseDescendants,
      } = useResources();
      const { windowIsSmall } = useKResponsiveWindow();

      return {
        sectionSettings$,
        numberOfSelectedBookmarks$,
        windowIsSmall,
        bookmarks,
        channels,
        channelTopics,
        _getTopicsWithExerciseDescendants,
      };
    },
    data() {
      return {
        viewMoreButtonState: 'no_more_results',
        // contentHasCheckbox: () => false,
        // contentIsSelected: () => '',
        searchTerm: '',
        // search: '',
        isExiting: false,
        filters: {
          channel: this.$route.query.channel || null,
          kind: this.$route.query.kind || null,
          role: this.$route.query.role || null,
        },
        visibleResources: [],
        showChannels: true,
      };
    },
    computed: {
      filteredContentList() {
        const { role } = this.filters;
        if (!this.inSearchMode) {
          return this.channels;
        }

        const list = this.channels ? this.channels : this.bookmarksList;
        return list.filter(contentNode => {
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
      // inputPlaceHolderStyle() {
      //   return {
      //     color: this.$themeTokens.annotation,
      //   };
      // },
      selectAllIsVisible() {
        // Do not show 'Select All' if on Search Results, on Channels Page,
        // or if all contents are topics
        return (
          !this.inSearchMode &&
          this.pageName !== LessonsPageNames.SELECTION_ROOT &&
          !every(this.quizForge.channels.value, this.contentIsDirectoryKind)
        );
      },
      contentIsInLesson() {
        return ({ id }) =>
          Boolean(this.workingResources.find(resource => resource.contentnode_id === id));
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
        const list = this.channels ? this.channels : this.bookmarksList;
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
    },

    watch: {
      workingResources(newVal, oldVal) {
        this.showResourcesDifferenceMessage(newVal.length - oldVal.length);
        this.debouncedSaveResources();
      },
      filters(newVal) {
        const newQuery = {
          ...this.$route.query,
          ...newVal,
        };

        this.$router.push({
          query: pickBy(newQuery),
        });
      },
    },
    beforeEnter(to, from, next) {
      console.log(to);
      console.log(from);
      console.log(to.params.topic_id);
      if (to.params.topic_id) {
        this.showChannelQuizCreationTopicPage(this.$store, to.params).then(() => {
          next();
        });
      }
    },

    beforeRouteLeave(to, from, next) {
      // Block the UI and show a notification in case last save takes too long
      this.isExiting = true;

      // If the working resources array hasn't changed at least once,
      // just exit without autosaving
      if (!this.resourcesChanged) {
        next();
        this.isExiting = false;
      } else {
        this.resourcesChanged = true;
        // const isSamePage = samePageCheckGenerator(this.$store);
        // setTimeout(() => {
        //   if (isSamePage()) {
        //     this.createSnackbar(this.$tr('saveBeforeExitSnackbarText'));
        //   }
        // }, 500);

        // Cancel any debounced calls
        this.debouncedSaveResources.cancel();
        this.saveLessonResources({
          lessonId: this.lessonId,
          resources: [...this.workingResources],
        })
          .then(() => {
            this.clearSnackbar();
            this.isExiting = false;
            next();
          })
          .catch(() => {
            this.showResourcesChangedError();
            this.isExiting = false;
            next(false);
          });
      }
    },
    created() {
      console.log(this.quizForge.channels.value);
      this.bookmarksCount = this.getBookmarks();
    },
    mounted() {
      if (this.quizForge.channels.value.length > 0) {
        this.visibleResources = this.quizForge.channels.value;
      } else {
        this.visibleResources = [];
      }

      setTimeout(() => {
        this.checkRoute();
      }, 1000);
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
      getBookmarks() {
        return this.bookmarks.length;
      },
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

        return null; // or return {} if you prefer an empty object
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
          this.removeFromSelectedResources(this.quizForge.channels.value);
        }
      },
      contentIsDirectoryKind({ is_leaf }) {
        return !is_leaf;
      },
      checkRoute() {
        if (this.$route.params.topic_id) {
          this._getTopicsWithExerciseDescendants(this.$route.params.topic_id);
        }
      },
      showChannelQuizCreationTopicPage(store, params) {
        return store.dispatch('loading').then(() => {
          const { topic_id } = params;
          const topicNodePromise = ContentNodeResource.fetchModel({ id: topic_id });
          const childNodesPromise = ContentNodeResource.fetchCollection({
            getParams: {
              parent: topic_id,
              kind_in: [ContentNodeKinds.TOPIC, ContentNodeKinds.EXERCISE],
              contains_quiz: true,
            },
          });
          const loadRequirements = [topicNodePromise, childNodesPromise];

          return Promise.all(loadRequirements).then(([, /*topicNoitde*/ childNodes]) => {
            this.filterAndAnnotateContentList(childNodes);
            // return filterAndAnnotateContentList(childNodes).then(contentList => {
            //   store.commit('SET_TOOLBAR_ROUTE', {
            //     name: PageNames.EXAMS,
            //   });

            //   return showExamCreationPage(store, {
            //     classId: params.classId,
            //     contentList,
            //     pageName: PageNames.EXAM_CREATION_SELECT_CHANNEL_QUIZ_TOPIC,
            //     ancestors: [...topicNode.ancestors, topicNode],
            //   });
            // });
          });
        });
      },
      // filteredquizForge.channels.value() {
      //   const { role } = this.filters;
      //   if (!this.inSearchMode) {
      //     return this.quizForge.channels.value;
      //   }
      //   const list =
      // this.quizForge.channels.value ? this.quizForge.channels.value : this.bookmarksList;
      //   return list.filter(contentNode => {
      //     let passesFilters = true;
      //     if (role === 'nonCoach') {
      //       passesFilters = passesFilters && contentNode.num_coach_contents === 0;
      //     }
      //     if (role === 'coach') {
      //       passesFilters = passesFilters && contentNode.num_coach_contents > 0;
      //     }
      //     return passesFilters;
      //   });
      // },
    },
    $trs: {},
  };

</script>


<style scoped>
.select-resource{
  margin-top: -4em;
}
.title-style{
  font-weight:600;
  font-size: 1.4em;
}
</style>
