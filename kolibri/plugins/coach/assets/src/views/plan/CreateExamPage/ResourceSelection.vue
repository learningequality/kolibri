<template>

  <div class="select-resource">
    <div v-if="loading">
      <KCircularLoader />
    </div>
    <div v-else>
      <h5
        class="title-style"
      >
        {{ /* selectFoldersOrExercises$() */ }}
      </h5>

      <div v-if="!isTopicIdSet && bookmarks.length && !showBookmarks">

        <p>{{ selectFromBookmarks$() }}</p>

        <div>
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

      <ResourceSelectionBreadcrumbs
        v-if="isTopicIdSet"
        :ancestors="topic.ancestors"
        :channelsLink="channelsLink"
        :topicsLink="topicsLink"
      />

      <ContentCardList
        :contentList="contentList"
        :showSelectAll="true"
        :viewMoreButtonState="viewMoreButtonState"
        :selectAllChecked="isSelectAllChecked"
        :contentIsChecked="contentPresentInWorkingResourcePool"
        :contentHasCheckbox="hasCheckbox"
        :contentCardMessage="selectionMetadata"
        :contentCardLink="contentLink"
        :selectAllIndeterminate="selectAllIndeterminate"
        @changeselectall="toggleTopicInWorkingResources"
        @change_content_card="toggleSelected"
        @moreresults="fetchMoreQuizResources"
      />

      <div class="bottom-navigation">
        <KGrid>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <span>{{ numberOfResources$({ count: workingResourcePool.length }) }}</span>
          </KGridItem>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <KButton
              style="float: right;"
              :text="coreString('saveChangesAction')"
              :primary="true"
              :disabled="!hasTopicId() && !showBookmarks"
              @click="saveSelectedResource"
            />
          </KGridItem>
        </KGrid>
      </div>
    </div>
  </div>

</template>


<script>

  import uniqWith from 'lodash/uniqWith';
  import isEqual from 'lodash/isEqual';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { computed, ref, getCurrentInstance, watch } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ContentNodeResource, ChannelResource } from 'kolibri.resources';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import useKResponsiveWindow from 'kolibri-design-system/lib/useKResponsiveWindow';
  import { PageNames } from '../../../constants';
  import BookmarkIcon from '../LessonResourceSelectionPage/LessonContentCard/BookmarkIcon.vue';
  import useQuizResources from '../../../composables/useQuizResources';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';
  import ResourceSelectionBreadcrumbs from './../LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs.vue';

  export default {
    name: 'ResourceSelection',
    components: {
      ContentCardList,
      BookmarkIcon,
      ResourceSelectionBreadcrumbs,
    },
    mixins: [commonCoreStrings],
    setup() {
      const store = getCurrentInstance().proxy.$store;
      const route = computed(() => store.state.route);
      const topicId = computed(() => route.value.params.topic_id);
      // We use this query parameter to decide if we want to show the Bookmarks Card
      // or the actual exercises that are bookmarked and can be selected
      // to be added to Quiz Section.
      const showBookmarks = computed(() => route.value.query.showBookmarks);
      const { updateSection, activeResourcePool, selectAllQuestions } = injectQuizCreation();

      const {
        sectionSettings$,
        selectFromBookmarks$,
        numberOfSelectedBookmarks$,
        //selectFoldersOrExercises$,
        numberOfSelectedResources$,
        numberOfResources$,
      } = enhancedQuizManagementStrings;

      // TODO let's not use text for this
      const viewMoreButtonState = computed(() => {
        if (hasMore.value) {
          return 'yes';
        } else {
          return 'no_more_results';
        }
      });

      const { windowIsSmall } = useKResponsiveWindow();

      /**
       * @type {Ref<QuizExercise[]>} - The uncommitted version of the section's resource_pool
       */
      const workingResourcePool = ref(activeResourcePool.value);

      /**
       * @param {QuizExercise[]} resources
       * @affects workingResourcePool -- Updates it with the given resources and is ensured to have
       * a list of unique resources to avoid unnecessary duplication
       */
      function addToWorkingResourcePool(resources = []) {
        workingResourcePool.value = uniqWith([...workingResourcePool.value, ...resources], isEqual);
      }

      /**
       * @param {QuizExercise} content
       * @affects workingResourcePool - Remove given quiz exercise from workingResourcePool
       */
      function removeFromWorkingResourcePool(content) {
        workingResourcePool.value = workingResourcePool.value.filter(obj => obj.id !== content.id);
      }

      /**
       * @affects workingResourcePool - Resets the workingResourcePool to the previous state
       */
      function resetWorkingResourcePool() {
        workingResourcePool.value = activeResourcePool.value;
      }

      /**
       * @param {QuizExercise} content
       * Check if the content is present in workingResourcePool
       */
      function contentPresentInWorkingResourcePool(content) {
        const workingResourceIds = workingResourcePool.value.map(wr => wr.id);
        return workingResourceIds.includes(content.id);
      }

      const {
        hasCheckbox,
        topic,
        resources,
        loading: quizResourcesLoading,
        fetchQuizResources,
        fetchMoreQuizResources,
        hasMore,
        annotateTopicsWithDescendantCounts,
        setResources,
      } = useQuizResources({ topicId });

      const _loading = ref(true);

      const channels = ref([]);
      const bookmarks = ref([]);

      // Load up the channels
      if (!topicId.value) {
        const channelBookmarkPromises = [
          ChannelResource.fetchCollection({
            params: { has_exercises: true, available: true },
          }).then(response => {
            setResources(
              response.map(chnl => {
                return {
                  ...chnl,
                  id: chnl.root,
                  title: chnl.name,
                  kind: ContentNodeKinds.CHANNEL,
                  is_leaf: false,
                };
              })
            );
          }),
          ContentNodeResource.fetchBookmarks({ params: { limit: 25, available: true } }).then(
            data => {
              bookmarks.value = data.results ? data.results : [];
            }
          ),
        ];

        Promise.all(channelBookmarkPromises).then(() => {
          // When we don't have a topicId we're setting the value of useQuizResources.resources
          // to the value of the channels (treating those channels as the topics) -- we then
          // call this annotateTopicsWithDescendantCounts method to ensure that the channels are
          // annotated with their num_assessments and those without assessments are filtered out
          annotateTopicsWithDescendantCounts(channels.value.map(c => c.id)).then(() => {
            _loading.value = false;
          });
        });
      }

      const loading = computed(() => {
        return _loading.value || quizResourcesLoading.value;
      });

      if (topicId.value) {
        fetchQuizResources().then(() => {
          _loading.value = false;
        });
      }

      const contentList = computed(() => {
        /*
        if (!topicId.value) {
          return channels.value;
        }
        */
        if (showBookmarks.value) {
          return bookmarks.value
            .filter(item => item.kind === 'exercise')
            .map(item => ({ ...item, is_leaf: true }));
        }

        return resources.value;
      });

      // This ought to be sure that we're updating our resources whenever the topicId changes
      // without remounting the whole component
      watch(topicId, () => {
        if (topicId.value) {
          fetchQuizResources();
        }
      });

      return {
        topic,
        topicId,
        contentList,
        resources,
        hasCheckbox,
        loading,
        hasMore,
        fetchMoreQuizResources,
        resetWorkingResourcePool,
        contentPresentInWorkingResourcePool,
        //contentList,
        sectionSettings$,
        selectFromBookmarks$,
        numberOfSelectedBookmarks$,
        //selectFoldersOrExercises$,
        numberOfSelectedResources$,
        numberOfResources$,
        windowIsSmall,
        bookmarks,
        channels,
        viewMoreButtonState,
        updateSection,
        selectAllQuestions,
        workingResourcePool,
        addToWorkingResourcePool,
        removeFromWorkingResourcePool,
        showBookmarks,
      };
    },
    props: {
      closePanelRoute: {
        type: Object,
        required: true,
      },
    },
    computed: {
      isTopicIdSet() {
        return this.$route.params.topic_id;
      },
      isSelectAllChecked() {
        // Returns true if all the resources in the topic are in the working resource pool
        const workingResourceIds = this.workingResourcePool.map(wr => wr.id);
        return this.contentList.every(content => workingResourceIds.includes(content.id));
      },
      selectAllIndeterminate() {
        // Returns true if some, but not all, of the resources in the topic are in the working
        // resource
        const workingResourceIds = this.workingResourcePool.map(wr => wr.id);
        return (
          !this.isSelectAllChecked &&
          this.contentList.some(content => workingResourceIds.includes(content.id))
        );
      },
      selectionMetadata(/*content*/) {
        // TODO This should return a function that returns a string telling us how many of this
        // topic's descendants are selected out of its total descendants -- basically answering
        // "How many resources in the working resource_pool are from this topic?"
        // Tracked in https://github.com/learningequality/kolibri/issues/11741
        return () => { this.workingResourcePool.length };
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
      getBookmarksLink() {
        // Inject the showBookmarks parameter so that
        // the resourceSelection component now renderes only the
        // the exercises that are bookmarked for the Quiz selection.
        return {
          name: PageNames.QUIZ_SELECT_RESOURCES,
          query: { showBookmarks: true },
        };
      },
      channelsLink() {
        return this.$router.getRoute(PageNames.QUIZ_SELECT_RESOURCES);
      },
      /*
      selectAllIsVisible() {
        TO BE IMPLEMENTED IN https://github.com/learningequality/kolibri/issues/11734
        Should only be visible if there are any checkboxes at all -- we'll only be showing
        checkboxes for Exercises, not topics
      },
      */
    },
    watch: {
      bookmarks(newVal) {
        this.bookmarksCount = newVal.length;
      },
    },
    methods: {
      /** @public */
      focusFirstEl() {
        this.$refs.textbox.focus();
      },
      contentLink(content) {
        if (this.showBookmarks) {
          return this.$route;
        } else if (!content.is_leaf) {
          return {
            name: PageNames.QUIZ_SELECT_RESOURCES,
            params: {
              topic_id: content.id,
              classId: this.$route.params.classId,
              section_id: this.$route.params.section_id,
            },
          };
        }

        return {}; // or return {} if you prefer an empty object
      },
      toggleSelected({ content, checked }) {
        if (checked) {
          this.addToSelectedResources(content);
        } else {
          this.removeFromWorkingResourcePool(content);
        }
      },
      addToSelectedResources(content) {
        this.addToWorkingResourcePool([content]);
      },
      toggleTopicInWorkingResources(isChecked) {
        if (isChecked) {
          this.addToWorkingResourcePool(this.contentList);
        } else {
          this.resetWorkingResourcePool();
        }
      },
      topicListingLink({ topicId }) {
        return this.$router.getRoute(
          PageNames.QUIZ_SELECT_RESOURCES,
          { topicId },
          this.$route.query
        );
      },

      topicsLink(topicId) {
        return this.topicListingLink({ ...this.$route.params, topicId });
      },
      hasTopicId() {
        return Boolean(this.$route.params.topic_id);
      },
      saveSelectedResource() {
        this.updateSection({
          section_id: this.$route.params.section_id,
          resource_pool: this.workingResourcePool,
        });

        //Also reset workingResourcePool
        this.resetWorkingResourcePool();

        this.$router.replace(this.closePanelRoute);
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
    },
  };

</script>


<style scoped lang="scss">

  @import '~kolibri-design-system/lib/styles/definitions';

  .select-resource {
    padding-bottom: 6em;
    margin-top: -4em;
  }

  .title-style {
    font-size: 1.4em;
    font-weight: 600;
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
    position: absolute;
    right: 0;
    bottom: 1.5em;
    left: 0;
    width: 100%;
    padding: 1em;
    text-align: center;
    background-color: white;
    border-top: 1px solid black;

    span {
      line-height: 2.5em;
    }
  }

</style>
