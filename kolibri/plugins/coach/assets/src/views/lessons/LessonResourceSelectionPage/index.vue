<template>

  <div class="selection-page">
    <ui-toolbar
      :title="$tr('toolbarTitle')"
      textColor="white"
      type="colored"
      class="immersive-header"
    >
      <div slot="icon">
        <router-link :to="lessonPage">
          <mat-svg
            class="exit-button"
            category="navigation"
            name="close"
          />
        </router-link>
      </div>
    </ui-toolbar>

    <div class="immersive-content">
      <form class="selection-form" @submit.prevent="saveResources">
        <h1 class="selection-header">{{ $tr('addResourcesHeader') }}</h1>

        <search-box />

        <k-breadcrumbs
          :items="selectionCrumbs"
          :showAllCrumbs="true"
        />

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
              :link="contentLink(content)"
            />
          </li>
        </ul>

        <div class="information">
          <p> {{ $tr('totalResourcesSelected', { total: selectedResources.length }) }} </p>
          <k-button
            type="submit"
            :primary="true"
            :text="$tr('save')"
          />
        </div>
      </form>
    </div>
  </div>

</template>


<script>

  import uiToolbar from 'keen-ui/src/UiToolbar';
  import contentCard from './content-card';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import { saveLessonResources } from '../../../state/actions/lessons';
  import { createSnackbar } from 'kolibri.coreVue.vuex.actions';
  import { LessonsPageNames } from '../../../lessonsConstants';
  import searchBox from '../../../../../../learn/assets/src/views/search-box/';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { lessonSummaryLink, selectionRootLink, topicListingLink } from '../lessonsRouterUtils';

  export default {
    name: 'lessonResourceSelectionPage',
    components: {
      uiToolbar,
      kBreadcrumbs,
      searchBox,
      contentCard,
      kButton,
      kCheckbox,
    },
    computed: {
      lessonPage() {
        return lessonSummaryLink(this.routerParams);
      },
      routerParams() {
        return { classId: this.classId, lessonId: this.lessonId };
      },
      selectionCrumbs() {
        return [
          // The "Channels" breadcrumb
          { text: this.$tr('channelBreadcrumbLabel'), link: selectionRootLink(this.routerParams) },
          // Ancestors breadcrumbs
          // NOTE: The current topic is injected into `ancestors` in the showPage action
          ...this.ancestors.map(a => ({
            text: a.title,
            link: topicListingLink({ ...this.routerParams, topicId: a.pk }),
          })),
        ];
      },
    },
    methods: {
      contentIsDirectoryKind({ kind }) {
        return kind === ContentNodeKinds.TOPIC || kind === ContentNodeKinds.CHANNEL;
      },
      contentLink(content) {
        if (this.contentIsDirectoryKind(content)) {
          return topicListingLink({ ...this.routerParams, topicId: content.id });
        }
        return {
          name: LessonsPageNames.CONTENT_PREVIEW,
          params: {
            ...this.routerParams,
            contentId: content.id,
          },
        };
      },
      saveResources() {
        const modelResources = this.selectedResources.map(resourceId => ({
          contentnode_id: resourceId,
        }));
        this.saveLessonResources(this.lessonId, modelResources).then(() => {
          const snackBarOptions = {
            text: this.$tr('resourceSaveConfirmation'),
            autoDismiss: true,
          };

          // route to summary page with confirmation message
          this.createSnackbar(snackBarOptions);
          this.$router.push({
            name: LessonsPageNames.SUMMARY,
          });
        });
      },
      isSelected(contentId) {
        // resource id is a content pk, but the pk === id in vuex
        return this.selectedResources.includes(contentId);
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
        lessonId: state => state.pageState.currentLesson.id,
        selectedResources: state => state.pageState.selectedResources,
        // TODO remove since we don't need it in template; use actions
        classId: state => state.classId,
        ancestors: state => state.pageState.ancestors || [],
        contentList: state => state.pageState.contentList,
      },
      actions: {
        saveLessonResources,
        createSnackbar,
        addToSelectedResources(store, contentId) {
          store.dispatch('ADD_TO_SELECTED_RESOURCES', contentId);
        },
        removeFromSelectedResources(store, contentId) {
          store.dispatch('REMOVE_FROM_SELECTED_RESOURCES', contentId);
        },
      },
    },
    $trs: {
      // TODO semantic string names
      addResourcesHeader: 'Add resources to your lesson',
      channelBreadcrumbLabel: 'Channels',
      save: 'Save',
      toolbarTitle: 'Select resources',
      totalResourcesSelected: 'Total resources selected: {total, number, integer}',
      resourceSaveConfirmation: 'Changes to lesson saved',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .exit-button
    fill: white
    margin-left: 0.5em
    font-size: 1rem

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

  .selection-form
    // offset to maintain straight lines in form w/ dynamic checkbox
    margin-left:64px

  .information
    text-align: right

  .immersive
    &-header
      position: fixed
      left: 0
      right: 0
      top: 0
      z-index: 4 // material spec
    &-content
      position: absolute
      top: 58px // height of action bar
      left: 0
      right: 0
      bottom: 0
      overflow-y: scroll
      padding: 32px

</style>
