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
        {{ /* selectFoldersOrExercises$() */ }}
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
        :selectAllChecked="false"
        :contentIsChecked="() => false"
        :contentHasCheckbox="hasCheckbox"
        :contentCardMessage="selectionMetadata"
        :contentCardLink="contentLink"
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
  import { computed, ref, getCurrentInstance, watch } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ContentNodeResource, ChannelResource } from 'kolibri.resources';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import useKResponsiveWindow from 'kolibri-design-system/lib/useKResponsiveWindow';
  import { PageNames } from '../../../constants';
  import BookmarkIcon from '../LessonResourceSelectionPage/LessonContentCard/BookmarkIcon.vue';
  import useQuizResources from '../../../composables/useQuizResources';
  //import { injectQuizCreation } from '../../../composables/useQuizCreation';
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

      //const { channels, loading, bookmarks, contentList } = useExerciseResources();

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
      };
    },
    computed: {
      isTopicIdSet() {
        return this.$route.params.topic_id;
      },
      selectionMetadata(/*content*/) {
        // TODO This should return a function that returns a string telling us how many of this
        // topic's descendants are selected out of its total descendants -- basically answering
        // "How many resources in the working resource_pool are from this topic?"
        // Tracked in https://github.com/learningequality/kolibri/issues/11741
        return () => '';
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
      goBack() {
        // TODO This should only be shown w/ the back arrow KRouterLink when we've gone past the
        // initial screen w/ the channels
        // See https://github.com/learningequality/kolibri/issues/11733
        return {}; // This will need to be gleaned in a nav guard
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
        if (!content.is_leaf) {
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
    position: fixed;
    bottom: 0;
    width: 50%;
    padding: 10px;
    color: black;
    text-align: center;
    background-color: white;
  }

</style>
