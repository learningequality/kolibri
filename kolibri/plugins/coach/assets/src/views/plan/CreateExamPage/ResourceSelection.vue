<template>

  <div class="select-resource">
    <h5
      class="title-style"
    >
      <KIcon
        icon="back"
      />
      Select folders or exercises from these channels
    </h5>
    <p>Select from bookmarks</p>

    <BookMarkedResource />

    <LessonsSearchBox
      ref="textbox"
      placeholder="search by keyword"
      :searchTerm="searchTerm"
      :inputPlaceHolderStyle="inputPlaceHolderStyle"
      style="margin-top:1em;margin-bottom:1em;"
      @searchterm="search"
    />
    <!-- <ResourceSelection
      :channelId="channelId"
      :channelName="channelName"
      :channelThumbnail="channelThumbnail"
      :channelDescription="channelDescription"
    />
    <ResourceSelectionBreadcrumbs
      :channelId="channelId"
      :channelName="channelName"
      :channelThumbnail="channelThumbnail"
      :channelDescription="channelDescription"
    />   -->

    <!-- <LessonContentCard

      title="content.title"
      thumbnail="content.thumbnail"
      description="content.description"
      kind="content.kind"
      message="contentCardMessage(content)"
      link="contentCardLink(content)"
      numCoachContents="content.num_coach_contents"
      isLeaf="content.is_leaf"
    /> -->
    <!-- <LessonContentCard
      title="content.title"
      thumbnail="content.thumbnail"
      description="content.description"
      kind="content.kind"
      message="contentCardMessage(content)"
      link="contentCardLink(content)"
      numCoachContents="content.num_coach_contents"
      isLeaf="content.is_leaf" -->
    <!-- /> -->

    <!-- <ContentCardList
      :quizForge.channels.value="filteredquizForge.channels.value"
      :contentCardMessage="selectionMetadata"
      :contentCardLink="contentLink"
      :viewMoreButtonState="viewMoreButtonState"
      :contentIsChecked="contentIsSelected"
      :contentHasCheckbox="contentHasCheckbox"
    /> -->

    <!-- <LessonContentCard
      v-for="(content ,index) in filteredquizForge.channels.value"
      :key="index"
      :class="{ 'with-checkbox': needCheckboxes }"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :description="content.description"
      :kind="content.kind"
      :message="contentCardMessage(content)"
      :link="contentCardLink(content)"
      :numCoachContents="content.num_coach_contents"
      :isLeaf="content.is_leaf"
    /> -->
    <ContentCardList
      :contentList="quizForge.channels.value"
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

  import { ContentNodeKinds , ContentNodeResource} from 'kolibri.coreVue.vuex.constants';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import every from 'lodash/every';
  import pickBy from 'lodash/pickBy';
  import { PageNames } from '../../../constants';
  import { LessonsPageNames } from '../../../constants/lessonsConstants';
  import LessonsSearchBox from './../LessonResourceSelectionPage/SearchTools/LessonsSearchBox.vue';
  import BookMarkedResource from './BookMarkedResource.vue';
  import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';
  // import LessonContentCard from './../LessonResourceSelectionPage/LessonContentCard/index.vue';
  // import ResourceSelection from './ResourceSelection.vue';
  // import  ResourceSelectionBreadcrumbs from './../../../views/plan/LessonResourceS
  // electionPage/SearchTools/ResourceSelectionBreadcrumbs.vue'

  export default {
    name: 'ResourceSelection',
    components: {
      LessonsSearchBox,
      BookMarkedResource,
      ContentCardList,
      // ResourceSelection,
      // ResourceSelectionBreadcrumbs,
      // LessonContentCard,
    },
    inject: ['quizForge'],
    setup() {
      const { sectionSettings$ } = enhancedQuizManagementStrings;

      return {
        sectionSettings$,
      };
    },
    data() {
      return {
        viewMoreButtonState: 'no_more_results',
        // contentHasCheckbox: () => false,
        // contentIsSelected: () => '',
        searchTerm: '',
        search: '',
        filters: {
          channel: this.$route.query.channel || null,
          kind: this.$route.query.kind || null,
          role: this.$route.query.role || null,
        },
        visibleResources:[],
      };
    },
    computed: {
      filteredContentList() {
        const { role } = this.filters;
        if (!this.inSearchMode) {
          return this.quizForge.channels.value;
        }
        const list = this.quizForge.channels.value
          ? this.quizForge.channels.value
          : this.bookmarksList;
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
    beforeRouteEnter (to, from, next) {
      console.log(to);
      console.log(from);
      console.log(to.params.topic_id);
      if(to.params.topic_id){
        this.showChannelQuizCreationTopicPage(this.$store,to.params).then(() => {
          next();
        });
      }
    },
    created() {
      console.log(this.quizForge.channels.value);
    },
    mounted() {
      if(this.quizForge.channels.value.length > 0){

        this.visibleResources = this.quizForge.channels.value;
      }else{
        this.visibleResources =[];
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
      contentLink(content) {
        if (!content.is_leaf) {
          return {
            name: PageNames.SELECT_FROM_RESOURCE,
            params: {
              topic_id: content.id,
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

        return Promise.all(loadRequirements).then(([/*topicNoitde*/, childNodes]) => {
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
}
      // filteredquizForge.channels.value() {
      //   const { role } = this.filters;
      //   if (!this.inSearchMode) {
      //     return this.quizForge.channels.value;
      //   }
      //   const list = this.quizForge.channels.value ? this.quizForge.channels.value : this.bookmarksList;
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
    $trs: {
      selectionInformation: {
        message: 'Channels',
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
