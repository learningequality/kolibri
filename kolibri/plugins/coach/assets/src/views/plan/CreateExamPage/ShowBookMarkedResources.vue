<template>

  <div class="">
    <ContentCardList
      :contentList="bookmarks"
      :showSelectAll="selectAllIsVisible"
      :viewMoreButtonState="viewMoreButtonState"
      :selectAllChecked="bookmarks.length === 0"
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

  import pickBy from 'lodash/pickBy';
  import { useResources } from '../../../composables/useResources';
  import { PageNames } from '../../../constants';
  import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';

  export default {
    name: 'ShowBookMarkedResources',
    components: {
      ContentCardList,
    },
    setup() {
      const { bookmarks } = useResources();

      return {
        bookmarks,
      };
    },
    data() {
      return {
        viewMoreButtonState: 'no_more_results',
      };
    },
    computed: {
      selectAllIsVisible() {
        return true;
      },
      addableContent() {
        // Content in the topic that can be added if 'Select All' is clicked
        const list = this.bookmarks;
        return list.filter(
          content => !this.contentIsDirectoryKind(content) && !this.contentIsInLesson(content)
        );
      },
      contentIsInLesson() {
        return ({ id }) => Boolean(this.bookmarks.find(resource => resource.contentnode_id === id));
      },
      selectionMetadata() {
        return '';
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
    methods: {
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
      addToSelectedResources(content) {
        const list =
          this.contentList && this.contentList.length ? this.contentList : this.bookmarksList;
        this.addToResourceCache({
          node: list.find(n => n.id === content.id),
        });
        this.addToWorkingResources([content]);
      },
      handleMoreResults() {},

      contentIsDirectoryKind({ is_leaf }) {
        return !is_leaf;
      },
    },
  };

</script>
