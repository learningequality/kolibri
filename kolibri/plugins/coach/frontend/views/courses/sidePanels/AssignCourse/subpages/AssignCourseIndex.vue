<template>

  <SidePanelLayout
    :closePanel="closePanel"
    :title="selectCourseLabel$()"
  >
    <template #default>
      <SearchBox
        maxWidth="unset"
        class="search-box"
        :disabled="isLoading"
        :value="searchKeywords"
        :placeholder="searchByKeyword$()"
        @change="searchKeywords = $event"
      />
      <KCircularLoader
        v-if="isLoading"
        disableDefaultTransition
      />
      <UpdatedResourceSelection
        v-if="!isLoading"
        isTopicSelectable
        :multi="false"
        :contentList="contentList"
        :hasMore="hasMore"
        :fetchMore="fetchMore"
        :loadingMore="loadingMore"
        :selectedResources="selectedResources"
        :getTopicLink="getCourseLink"
        :cardsHeadingLevel="2"
        @setSelectedResources="setSelectedResourcesHandler"
      />
    </template>
    <template #bottomNavigation>
      <div class="bottom-actions">
        <KButton
          :text="cancelAction$()"
          @click="closePanel"
        />
        <KButton
          primary
          :disabled="!selectedCourse"
          :text="selectRecipientsLabel$()"
          @click="selectRecipients"
        />
      </div>
    </template>
  </SidePanelLayout>

</template>


<script>

  import { useRoute, useRouter } from 'vue-router/composables';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import SearchBox from 'kolibri-common/components/SearchBox';
  import { computed } from 'vue';
  import SidePanelLayout from 'kolibri-common/components/courses/sidePanel/SidePanelLayout';
  import { overrideRoute } from '../../../../../utils';
  import { PageNames } from '../../../../../constants';

  import { injectAssignCourse } from '../../../composables/useAssignCourse';
  import UpdatedResourceSelection from '../../../../common/resourceSelection/UpdatedResourceSelection.vue';

  export default {
    name: 'AssignCourseIndexSubpage',
    components: {
      SearchBox,
      SidePanelLayout,
      UpdatedResourceSelection,
    },
    setup(props, { emit }) {
      const route = useRoute();
      const router = useRouter();

      const closePanel = () => {
        emit('closePanel');
      };

      const { searchKeywords, coursesFetch, selectedCourse, selectCourse } = injectAssignCourse();

      const { cancelAction$, searchByKeyword$ } = coreStrings;
      const { selectCourseLabel$, selectRecipientsLabel$ } = coursesStrings;

      const selectRecipients = () => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_SELECT_RECIPIENTS,
          }),
        );
      };

      const { data, hasMore, fetchMore, loading, loadingMore } = coursesFetch;
      const selectedResources = computed(() => {
        return selectedCourse.value ? [selectedCourse.value] : [];
      });

      const getCourseLink = courseId => {
        return overrideRoute(route, {
          name: PageNames.COURSES_ASSIGN_COURSE_DETAILS,
          params: { courseId },
        });
      };

      const setSelectedResourcesHandler = resources => {
        const [course] = resources;
        selectCourse(course);
      };

      return {
        isLoading: loading,
        searchKeywords,
        contentList: data,
        hasMore,
        loadingMore,
        selectedCourse,
        selectedResources,
        setSelectedResourcesHandler,

        fetchMore,
        closePanel,
        getCourseLink,
        selectRecipients,

        cancelAction$,
        selectCourseLabel$,
        searchByKeyword$,
        selectRecipientsLabel$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .search-box {
    margin-top: 8px;
    margin-right: 0;
    margin-bottom: 12px;
  }

  .bottom-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    width: 100%;
  }

</style>
