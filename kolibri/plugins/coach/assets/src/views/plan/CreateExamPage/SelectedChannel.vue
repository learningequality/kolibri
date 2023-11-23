<template>

  <div class="">
    <div class="">
      <KIconButton
        icon="back"
      />
      {{ selectFoldersOrExercises$() }}
    </div>

    <h2>channel name</h2>

    <ResourceSelectionBreadcrumbs
      :ancestors="ancestors"
      :channelsLink="channelsLink"
      :topicsLink="topicsLink"
    />

    <ContentCardList
      :contentList="filteredContentList"
      :showSelectAll="selectAllIsVisible"
      :viewMoreButtonState="viewMoreButtonState"
      :selectAllChecked="filteredContentList.length === 0"
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

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { mapState } from 'vuex';
  import { PageNames } from '../../../constants';
  import { useResources } from '../../../composables/useResources';
  import ResourceSelectionBreadcrumbs from '../LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs';
  import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';

  export default {
    name: 'SelectedChannel',
    components: {
      ResourceSelectionBreadcrumbs,
      ContentCardList,
    },
    setup() {
      const {
        sectionSettings$,
        selectFoldersOrExercises$,
        selectFromBookmarks$,
      } = enhancedQuizManagementStrings;

      const { channels } = useResources();

      return {
        sectionSettings$,
        selectFoldersOrExercises$,
        selectFromBookmarks$,
        channels,
      };
    },
    data() {
      return {
        filters: {
          channel: this.$route.query.channel || null,
          kind: this.$route.query.kind || null,
          role: this.$route.query.role || null,
        },
        viewMoreButtonState: 'no_more_results',
      };
    },
    computed: {
      ...mapState('lessonSummary/resources', ['ancestors']),
      channelsLink() {
        return this.selectionRootLink();
      },
      filteredContentList() {
        const { role } = this.filters;

        const list = this.channels ? this.channels : [];
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
      selectAllIsVisible() {
        return true;
      },
      addableContent() {
        // Content in the topic that can be added if 'Select All' is clicked
        const list = this.filteredContentList;
        return list.filter(
          content => !this.contentIsDirectoryKind(content) && !this.contentIsInLesson(content)
        );
      },
      contentIsInLesson() {
        return ({ id }) =>
          Boolean(this.filteredContentList.find(resource => resource.contentnode_id === id));
      },
      selectionMetadata() {
        return '';
      },
    },
    methods: {
      // ...mapActions('lessonSummary/resources', ['fetchAdditionalSearchResults']),
      topicsLink(topicId) {
        return this.topicListingLink({ ...this.$route.params, topicId });
      },
      topicListingLink({ topicId }) {
        return this.$router.getRoute(PageNames.SELECTION, { topicId }, this.$route.query);
      },
      selectionRootLink() {
        return this.$router.getRoute(PageNames.SELECTION_ROOT, {}, this.$route.query);
      },
      contentIsDirectoryKind({ is_leaf }) {
        return !is_leaf;
      },
      contentLink(content) {
        if (!content.is_leaf) {
          return {
            name: PageNames.SELECT_FROM_RESOURCE,
            params: {
              topic_id: content.id,
            },
          };
        } else {
          return {};
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
      toggleSelected({ content, checked }) {
        if (checked) {
          this.addToSelectedResources(content);
        } else {
          this.removeFromSelectedResources([content]);
        }
      },
      handleMoreResults() {
        this.fetchAdditionalSearchResults({
          searchTerm: '',
          kind: this.filters.kind,
          channelId: this.filters.channel,
        })
          .then(() => {
            this.moreResultsState = null;
          })
          .catch(() => {
            this.moreResultsState = 'error';
          });
      },
    },
  };

</script>
