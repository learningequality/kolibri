<template>

  <div class="select-resource">
    <h5
      class="title-style"
    >
      <KIconButton
        icon="back"
      />
      {{ selectFoldersOrExercises$() }}
    </h5>
    <p> {{ selectFromBookmarks$() }}</p>

    <BookMarkedResource
      v-if="bookmarks.length > 0"
      kind="bookmark"
      :isMobile="true"
      :to="to"
      :bookMarkedResoures="bookmarks.length"
    />

    <LessonsSearchBox
      ref="textbox"
      placeholder="search by keyword"
      :searchTerm="searchTerm"
      :inputPlaceHolderStyle="inputPlaceHolderStyle"
      style="margin-top:1em;margin-bottom:1em;"
      @searchterm="search"
    />

    <ContentCardList
      :contentList="channels"
      :showSelectAll="selectAllIsVisible"
      :viewMoreButtonState="viewMoreButtonState"
      :selectAllChecked="addableContent.length === 0"
      :contentIsChecked="contentIsInLesson"
      :contentHasCheckbox="c => !contentIsDirectoryKind(c)"
      :contentCardMessage="() =>selectionMetadata"
      :contentCardLink="contentLink"
      @changeselectall="toggleTopicInWorkingResources"
      @change_content_card="toggleSelected"
      @moreresults="handleMoreResults"
    />
  </div>

</template>


<script>

  import { ContentNodeKinds, ContentNodeResource } from 'kolibri.coreVue.vuex.constants';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import every from 'lodash/every';
  import pickBy from 'lodash/pickBy';
  import { PageNames } from '../../../constants';
  import { LessonsPageNames } from '../../../constants/lessonsConstants';
  import { useResources } from '../../../composables/useResources';
  import LessonsSearchBox from './../LessonResourceSelectionPage/SearchTools/LessonsSearchBox.vue';
  import BookMarkedResource from './BookMarkedResource.vue';
  import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';

  export default {
    name: 'ResourceSelection',
    components: {
      LessonsSearchBox,
      BookMarkedResource,
      ContentCardList,
    },
    inject: ['quizForge'],
    setup() {
      const { 
        sectionSettings$,
        selectFoldersOrExercises$,
        selectFromBookmarks$,
      } = enhancedQuizManagementStrings;

      const { channels, bookmarks } = useResources();

      return {
        sectionSettings$,
        selectFoldersOrExercises$,
        selectFromBookmarks$,
        channels,
        bookmarks,
      };
    },
    data() {
      return {
        viewMoreButtonState: 'no_more_results',
        searchTerm: '',
        search: '',
        filters: {
          channel: this.$route.query.channel || null,
          kind: this.$route.query.kind || null,
          role: this.$route.query.role || null,
        },
        visibleResources: [],
      };
    },
    computed: {
      inSearchMode() {
        return this.pageName === LessonsPageNames.SELECTION_SEARCH;
      },
      inputPlaceHolderStyle() {
        return {
          color: this.$themeTokens.annotation,
        };
      },
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
        return '';
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
        const list = this.quizForge.channels.value
          ? this.quizForge.channels.value
          : this.bookmarksList;
        return list.filter(
          content => !this.contentIsDirectoryKind(content) && !this.contentIsInLesson(content)
        );
      },
      to(){
        return {
          name: PageNames.BOOK_MARKED_RESOURCES,
          params:{
            classId: this.$route.params.classId,
            section_id: this.$route.params.section_id,
          }
        }
      }
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
    beforeRouteEnter(to, from, next) {
      // console.log(to);
      // console.log(from);
      // console.log(to.params.topic_id);
      if (to.params.topic_id) {
        this.showChannelQuizCreationTopicPage(this.$store, to.params).then(() => {
          next();
        });
      }
    },
    mounted() {
      if (this.quizForge.channels.value.length > 0) {
        this.visibleResources = this.quizForge.channels.value;
      } else {
        this.visibleResources = [];
      }
      console.log(this.channels);
    },
    methods: {
      /** @public */
      focusFirstEl() {
        this.$refs.textbox.focus();
      },

      contentLink(content) {
        if (!content.is_leaf) {
          return {
            name: PageNames.SELECT_FROM_RESOURCE,
            params: {
              topic_id: content.id,
              classId: this.$route.params.classId,
              section_id: this.$route.params.section_id
            },
          };
        }
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
            console.log(childNodes);
            this.visibleResources = childNodes;
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
    },
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
