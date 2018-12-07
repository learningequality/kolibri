<template>

  <div>
    <h1>
      {{ $tr('documentTitle', { lessonName: currentLesson.title }) }}
    </h1>

    <KGrid>
      <KGridItem
        sizes="100, 100, 50"
        percentage
      >
        <KButton
          v-if="inSearchMode"
          class="exit-search-button"
          :text="$tr('exitSearchButtonLabel')"
          appearance="raised-button"
          @click="handleExitSearch"
        />
        <LessonsSearchBox @searchterm="handleSearchTerm" />
      </KGridItem>

      <KGridItem
        sizes="100, 100, 50"
        percentage
        alignments="left, left, right"
      >
        <p>
          {{ $tr('totalResourcesSelected', { total: workingResources.length }) }}
        </p>
      </KGridItem>
    </KGrid>

    <LessonsSearchFilters
      v-if="inSearchMode"
      v-model="filters"
      class="search-filters"
      :searchTerm="searchTerm"
      :searchResults="searchResults"
    />

    <ResourceSelectionBreadcrumbs
      v-if="!inSearchMode"
      :ancestors="ancestors"
      :channelsLink="channelsLink"
      :topicsLink="topicsLink"
    />

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

</template>


<script>

  import { mapState, mapActions, mapGetters, mapMutations } from 'vuex';
  import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
  import debounce from 'lodash/debounce';
  import every from 'lodash/every';
  import pickBy from 'lodash/pickBy';
  import xor from 'lodash/xor';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { LessonsPageNames } from '../../../constants/lessonsConstants';
  import { topicListingLink, selectionRootLink } from '../lessonsRouterUtils';
  import LessonsSearchBox from './SearchTools/LessonsSearchBox';
  import LessonsSearchFilters from './SearchTools/LessonsSearchFilters';
  import ResourceSelectionBreadcrumbs from './SearchTools/ResourceSelectionBreadcrumbs';
  import ContentCardList from './ContentCardList';

  export default {
    name: 'LessonResourceSelectionPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle', { lessonName: this.currentLesson.title }),
      };
    },
    components: {
      ContentCardList,
      KButton,
      KGrid,
      KGridItem,
      LessonsSearchFilters,
      LessonsSearchBox,
      ResourceSelectionBreadcrumbs,
    },
    data() {
      return {
        // null corresponds to 'All' filter value
        filters: {
          channel: this.$route.query.channel || null,
          kind: this.$route.query.kind || null,
          role: this.$route.query.role || null,
        },
        isExiting: false,
        workingResourcesCopy: [...this.$store.state.lessonSummary.workingResources],
        moreResultsState: null,
      };
    },
    computed: {
      ...mapState(['classId', 'pageName']),
      ...mapState('lessonSummary', ['currentLesson', 'workingResources', 'resourceCache']),
      ...mapState('lessonSummary/resources', [
        'ancestorCounts',
        'contentList',
        'searchResults',
        'ancestors',
      ]),
      ...mapGetters('lessonSummary/resources', ['numRemainingSearchResults']),
      filteredContentList() {
        const { role } = this.filters;
        if (!this.inSearchMode) {
          return this.contentList;
        }
        return this.searchResults.results.filter(contentNode => {
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
      lessonId() {
        return this.currentLesson.id;
      },
      inSearchMode() {
        return this.pageName === LessonsPageNames.SELECTION_SEARCH;
      },
      searchTerm() {
        return this.$route.params.searchTerm;
      },
      routerParams() {
        return { classId: this.classId, lessonId: this.lessonId };
      },
      debouncedSaveResources() {
        return debounce(this.saveResources, 1000);
      },
      selectAllIsVisible() {
        // Do not show 'Select All' if on Search Results, on Channels Page,
        // or if all contents are topics
        return (
          !this.inSearchMode &&
          this.pageName !== LessonsPageNames.SELECTION_ROOT &&
          !every(this.contentList, this.contentIsDirectoryKind)
        );
      },
      viewMoreButtonState() {
        if (this.moreResultsState === 'waiting' || this.moreResultsState === 'error') {
          return this.moreResultsState;
        }
        if (!this.inSearchMode || this.numRemainingSearchResults === 0) {
          return 'no_more_results';
        }
        return 'visible';
      },
      contentIsInLesson() {
        return ({ id }) => this.workingResources.includes(id);
      },
      addableContent() {
        // Content in the topic that can be added if 'Select All' is clicked
        return this.contentList.filter(
          content => !this.contentIsDirectoryKind(content) && !this.contentIsInLesson(content)
        );
      },
      channelsLink() {
        return selectionRootLink(this.$route.params);
      },
    },
    watch: {
      workingResources(newVal, oldVal) {
        this.showResourcesDifferenceMessage(newVal.length - oldVal.length);
        this.debouncedSaveResources();
      },
      filters(newVal) {
        this.$router.push({
          query: { ...this.$route.query, ...pickBy(newVal) },
        });
      },
    },
    beforeRouteLeave(to, from, next) {
      // Only autosave if changes have been made
      if (xor(this.workingResources, this.workingResourcesCopy).length > 0) {
        // Block the UI and show a notification in case last save takes too long
        this.isExiting = true;
        const isSamePage = samePageCheckGenerator(this.$store);
        setTimeout(() => {
          if (isSamePage()) {
            this.createSnackbar({
              text: this.$tr('saveBeforeExitSnackbarText'),
            });
          }
        }, 500);

        // Cancel any debounced calls
        this.debouncedSaveResources.cancel();
        this.saveLessonResources({
          lessonId: this.lessonId,
          resourceIds: [...this.workingResources],
        })
          .then(() => {
            this.clearSnackbar();
            next();
          })
          .catch(() => {
            this.showResourcesChangedError();
            this.isExiting = false;
            next(false);
          });
      } else {
        next();
      }
    },
    methods: {
      ...mapActions(['createSnackbar', 'clearSnackbar']),
      ...mapActions('lessonSummary', ['saveLessonResources', 'addToResourceCache']),
      ...mapActions('lessonSummary/resources', ['fetchAdditionalSearchResults']),
      ...mapMutations('lessonSummary', {
        addToWorkingResources: 'ADD_TO_WORKING_RESOURCES',
        removeFromSelectedResources: 'REMOVE_FROM_WORKING_RESOURCES',
      }),
      showResourcesDifferenceMessage(difference) {
        let text;
        if (difference > 0) {
          text = this.$tr('resourcesAddedSnackbarText', { count: difference });
        } else {
          text = this.$tr('resourcesRemovedSnackbarText', { count: -difference });
        }
        this.createSnackbar({ text, autoDismiss: true });
      },
      showResourcesChangedError() {
        this.createSnackbar({
          text: this.$tr('resourcesChangedErrorSnackbarText'),
          autoDismiss: true,
        });
      },
      toggleTopicInWorkingResources(isChecked) {
        if (isChecked) {
          this.addableContent.forEach(resource => {
            this.addToResourceCache({
              node: { ...resource },
            });
          });
          this.addToWorkingResources(this.addableContent.map(({ id }) => id));
        } else {
          this.removeFromSelectedResources(this.contentList.map(({ id }) => id));
        }
      },
      addToSelectedResources(contentId) {
        this.addToResourceCache({
          node: this.contentList.find(n => n.id === contentId),
        });
        this.addToWorkingResources([contentId]);
      },
      // IDEA refactor router logic into actions
      contentIsDirectoryKind({ kind }) {
        return kind === ContentNodeKinds.TOPIC || kind === ContentNodeKinds.CHANNEL;
      },
      // IDEA refactor router logic into actions
      contentLink(content) {
        if (this.contentIsDirectoryKind(content)) {
          return topicListingLink({ ...this.routerParams, topicId: content.id });
        }
        const { query } = this.$route;
        return {
          name: LessonsPageNames.SELECTION_CONTENT_PREVIEW,
          params: {
            ...this.routerParams,
            contentId: content.id,
          },
          query: {
            ...query,
            ...pickBy({
              searchTerm: this.$route.params.searchTerm,
            }),
          },
        };
      },
      handleExitSearch() {
        const lastId = this.$route.query.last_id;
        if (lastId) {
          this.$router.push(topicListingLink({ ...this.routerParams, topicId: lastId }));
        } else {
          this.$router.push(selectionRootLink({ ...this.routerParams }));
        }
      },
      saveResources() {
        return this.saveLessonResources({
          lessonId: this.lessonId,
          resourceIds: this.workingResources,
        });
      },
      selectionMetadata(content) {
        const count = this.ancestorCounts[content.id];
        if (count) {
          return this.$tr('selectionInformation', { count, total: this.workingResources.length });
        }
        return '';
      },
      toggleSelected({ checked, contentId }) {
        if (checked) {
          this.addToSelectedResources(contentId);
        } else {
          this.removeFromSelectedResources(contentId);
        }
      },
      handleSearchTerm(searchTerm) {
        this.isExiting = true;
        const lastId = this.$route.query.last_id || this.$route.params.topicId;
        this.$router.push({
          name: LessonsPageNames.SELECTION_SEARCH,
          params: {
            searchTerm,
          },
          query: {
            last_id: lastId,
          },
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
          })
          .catch(() => {
            this.moreResultsState = 'error';
          });
      },
      topicsLink(topicId) {
        return topicListingLink({ ...this.$route.params, topicId });
      },
    },
    $trs: {
      // TODO semantic string names
      save: 'Save',
      // TODO: Handle singular/plural
      selectionInformation:
        '{count, number, integer} of {total, number, integer} resources selected',
      totalResourcesSelected:
        '{total, number, integer} {total, plural, one {resource} other {resources}} in this lesson',
      documentTitle: `Manage resources in '{lessonName}'`,
      selectAllCheckboxLabel: 'Select all',
      resourcesAddedSnackbarText:
        'Added {count, number, integer} {count, plural, one {resource} other {resources}} to lesson',
      resourcesRemovedSnackbarText:
        'Removed {count, number, integer} {count, plural, one {resource} other {resources}} from lesson',
      resourcesChangedErrorSnackbarText: 'There was a problem updating this lesson',
      saveBeforeExitSnackbarText: 'Saving your changes…',
      // only shown on search page
      exitSearchButtonLabel: 'Exit search',
    },
  };

</script>


<style lang="scss" scoped>

  .exit-search-button {
    margin-left: 0;
  }

  .search-filters {
    margin-top: 24px;
  }

</style>
