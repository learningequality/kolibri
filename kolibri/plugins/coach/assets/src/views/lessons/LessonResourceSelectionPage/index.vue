<template>

  <form
    class="resource-selection-page"
    @submit.prevent="saveResources"
  >
    <h1 class="selection-header">
      {{ $tr('addResourcesHeader') }}
    </h1>

    <search-tools />

    <div class="information">
      <p> {{ $tr('totalResourcesSelected', { total: workingResources.length }) }} </p>
      <k-button
        type="submit"
        :primary="true"
        :text="$tr('save')"
      />
    </div>

    <ul class="content-list">
      <li
        class="content-list-item"
        :key="content.id"
        v-for="content in contentList"
      >
        <k-checkbox
          class="content-checkbox"
          :label="content.title"
          v-if="!contentIsDirectoryKind(content)"
          :showLabel="false"
          :checked="isSelected(content.id)"
          @change="toggleSelected($event, content.id)"
        />
        <content-card
          class="content-card"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :description="content.description"
          :kind="content.kind"
          :message="selectionMetadata(content.id)"
          :link="contentLink(content)"
          :numCoachContents="content.num_coach_contents"
        />
      </li>
    </ul>

    <div class="information" v-if="contentList.length > 2">
      <p> {{ $tr('totalResourcesSelected', { total: workingResources.length }) }} </p>
      <k-button
        type="submit"
        :primary="true"
        :text="$tr('save')"
      />
    </div>
  </form>

</template>


<script>

  import uiToolbar from 'keen-ui/src/UiToolbar';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import { createSnackbar } from 'kolibri.coreVue.vuex.actions';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { saveLessonResources } from '../../../state/actions/lessons';
  import { LessonsPageNames } from '../../../constants/lessonsConstants';
  import { lessonSummaryLink, topicListingLink } from '../lessonsRouterUtils';
  import searchTools from './searchTools';
  import contentCard from './content-card';

  export default {
    name: 'lessonResourceSelectionPage',
    components: {
      uiToolbar,
      contentCard,
      kButton,
      kCheckbox,
      searchTools,
    },
    computed: {
      lessonPage() {
        return lessonSummaryLink(this.routerParams);
      },
      routerParams() {
        return { classId: this.classId, lessonId: this.lessonId };
      },
    },
    methods: {
      // IDEA refactor router logic into actions
      contentIsDirectoryKind({ kind }) {
        return kind === ContentNodeKinds.TOPIC || kind === ContentNodeKinds.CHANNEL;
      },
      // IDEA refactor router logic into actions
      contentLink(content) {
        if (this.contentIsDirectoryKind(content)) {
          return topicListingLink({ ...this.routerParams, topicId: content.id });
        }
        return {
          name: LessonsPageNames.SELECTION_CONTENT_PREVIEW,
          params: {
            ...this.routerParams,
            contentId: content.id,
          },
        };
      },
      saveResources() {
        this.saveLessonResources(this.lessonId, this.workingResources).then(() => {
          // route to summary page with confirmation message
          this.createSnackbar({
            text: this.$tr('resourceSaveConfirmation'),
            autoDismiss: true,
          });
          this.$router.push(lessonSummaryLink(this.routerParams));
        });
      },
      selectionMetadata(contentId) {
        const count = this.ancestorCounts[contentId];
        const total = this.workingResources.length;
        if (count) {
          return this.$tr('selectionInformation', { count, total });
        }
        return '';
      },
      isSelected(contentId) {
        // resource id is a content pk, but the pk === id in vuex
        return this.workingResources.includes(contentId);
      },
      toggleSelected(checked, contentId) {
        if (checked) {
          this.addToSelectedResources(contentId);
        } else {
          this.removeFromSelectedResources(contentId);
        }
      },
    },
    vuex: {
      getters: {
        currentLesson: state => state.pageState.currentLesson,
        lessonId: state => state.pageState.currentLesson.id,
        workingResources: state => state.pageState.workingResources,
        // TODO remove since we don't need it in template; use actions
        classId: state => state.classId,
        contentList: state => state.pageState.contentList,
        resourceCache: state => state.pageState.resourceCache,
        ancestorCounts: state => state.pageState.ancestorCounts,
      },
      actions: {
        saveLessonResources,
        createSnackbar,
        addToSelectedResources(store, contentId) {
          store.dispatch('ADD_TO_RESOURCE_CACHE', this.contentList.find(n => n.id === contentId));
          store.dispatch('ADD_TO_WORKING_RESOURCES', contentId);
        },
        removeFromSelectedResources(store, contentId) {
          store.dispatch('REMOVE_FROM_WORKING_RESOURCES', contentId);
        },
      },
    },
    $trs: {
      // TODO semantic string names
      addResourcesHeader: 'Add resources to your lesson',
      save: 'Save',
      selectionInformation:
        '{count, number, integer} of {total, number, integer} resources selected',
      totalResourcesSelected: 'Total resources selected: {total, number, integer}',
      // only shown on search page
      // TODO add search page check for this
      sourceInformation: 'from {sourceName}',
      resourceSaveConfirmation: 'Changes to lesson saved',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .content-list
    list-style: none
    display: block
    padding: 0

  .content-list-item
    position: relative
    text-align: right
    display: block

  .content-checkbox
    display: inline-block
    position: absolute
    top: 34% // offset accouting for shadow on card
    left: -32px

  .content-card
    width: 100%

  .resource-selection-page
    // offset to maintain straight lines in form w/ dynamic checkbox
    margin-left:64px

  .information
    text-align: right

</style>
