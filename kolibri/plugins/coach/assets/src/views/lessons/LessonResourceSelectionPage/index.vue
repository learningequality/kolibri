<template>

  <form
    class="resource-selection-page"
    @submit.prevent="saveResources"
  >
    <h1 class="selection-header">
      {{ $tr('addResourcesHeader') }}
    </h1>

    <SearchTools />

    <div class="information">
      <p> {{ $tr('totalResourcesSelected', { total: workingResources.length }) }} </p>
      <KButton
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
        <KCheckbox
          class="content-checkbox"
          :label="content.title"
          v-if="!contentIsDirectoryKind(content)"
          :showLabel="false"
          :checked="isSelected(content.id)"
          @change="toggleSelected($event, content.id)"
        />
        <LessonContentCard
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
      <KButton
        type="submit"
        :primary="true"
        :text="$tr('save')"
      />
    </div>
  </form>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import UiToolbar from 'keen-ui/src/UiToolbar';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { LessonsPageNames } from '../../../constants/lessonsConstants';
  import { lessonSummaryLink, topicListingLink } from '../lessonsRouterUtils';
  import SearchTools from './SearchTools';
  import LessonContentCard from './LessonContentCard';

  export default {
    name: 'LessonResourceSelectionPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      UiToolbar,
      LessonContentCard,
      KButton,
      KCheckbox,
      SearchTools,
    },
    computed: {
      ...mapState(['classId']),
      ...mapState({
        currentLesson: state => state.pageState.currentLesson,
        lessonId: state => state.pageState.currentLesson.id,
        workingResources: state => state.pageState.workingResources,
        contentList: state => state.pageState.contentList,
        resourceCache: state => state.pageState.resourceCache,
        ancestorCounts: state => state.pageState.ancestorCounts,
      }),
      lessonPage() {
        return lessonSummaryLink(this.routerParams);
      },
      routerParams() {
        return { classId: this.classId, lessonId: this.lessonId };
      },
    },
    methods: {
      ...mapActions(['createSnackbar', 'saveLessonResources']),
      addToSelectedResources(contentId) {
        this.$store.commit('ADD_TO_RESOURCE_CACHE', this.contentList.find(n => n.id === contentId));
        this.$store.commit('ADD_TO_WORKING_RESOURCES', contentId);
      },
      removeFromSelectedResources(contentId) {
        this.$store.commit('REMOVE_FROM_WORKING_RESOURCES', contentId);
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
        return {
          name: LessonsPageNames.SELECTION_CONTENT_PREVIEW,
          params: {
            ...this.routerParams,
            contentId: content.id,
          },
        };
      },
      saveResources() {
        this.saveLessonResources({
          lessonId: this.lessonId,
          resourceIds: this.workingResources,
        }).then(() => {
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
        // resource id is a content id,
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
      documentTitle: 'Select resources',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .content-list {
    display: block;
    padding: 0;
    list-style: none;
  }

  .content-list-item {
    position: relative;
    display: block;
    text-align: right;
  }

  .content-checkbox {
    position: absolute;
    top: 34%; // offset accouting for shadow on card
    left: -32px;
    display: inline-block;
  }

  .content-card {
    width: 100%;
  }

  .resource-selection-page {
    // offset to maintain straight lines in form w/ dynamic checkbox
    margin-left: 64px;
  }

  .information {
    text-align: right;
  }

</style>
