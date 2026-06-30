<template>

  <SidePanelLayout
    :title="previewCourseResourcesTitle$()"
    :goBack="goBack"
  >
    <!-- :key remounts on ID change: useFetchContentNode only fetches once in setup(),
       so without a fresh instance, switching resources would show stale data
      therefore, don't delete :key -->
    <CourseResourcePreview
      v-if="previewContentId"
      :key="previewContentId"
      :contentId="previewContentId"
      :breadcrumbItems="breadcrumbItems"
    />

    <template v-else>
      <KCircularLoader v-if="loading" />
      <div v-else-if="children">
        <div
          v-if="topic"
          class="topic-header"
        >
          <h2
            class="topic-title"
            dir="auto"
          >
            {{ topic.title }}
          </h2>
        </div>

        <KBreadcrumbs
          v-if="topic && breadcrumbItems.length > 1"
          :items="breadcrumbItems"
        />

        <KCardGrid layout="1-1-1">
          <component
            :is="child.is_leaf ? 'AccessibleResourceCard' : 'AccessibleFolderCard'"
            v-for="child in children"
            :key="child.id"
            :to="child.is_leaf ? getResourceRoute(child.id) : getTopicRoute(child.id)"
            :contentNode="child"
            :headingLevel="3"
            :showBookmarkButton="false"
          />
        </KCardGrid>

        <KButton
          v-if="hasMore && !loadingMore"
          :primary="false"
          class="load-more-button"
          :text="viewMoreAction$()"
          @click="fetchMore"
        />
        <KCircularLoader
          v-if="loadingMore"
          :delay="false"
        />
      </div>
    </template>
  </SidePanelLayout>

</template>


<script>

  import { ref, computed, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import SidePanelLayout from 'kolibri-common/components/courses/sidePanel/SidePanelLayout';
  import useFetch from 'kolibri-common/composables/useFetch';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import AccessibleFolderCard from 'kolibri-common/components/Cards/AccessibleFolderCard';
  import AccessibleResourceCard from 'kolibri-common/components/Cards/AccessibleResourceCard';
  import { overrideRoute } from '../../../../../utils';
  import { PageNames } from '../../../../../constants';
  import CourseResourcePreview from './CourseResourcePreview';

  export default {
    name: 'CoursePreviewSidePanel',
    components: {
      SidePanelLayout,
      AccessibleFolderCard,
      AccessibleResourceCard,
      CourseResourcePreview,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();
      const topic = ref(null);
      const { viewMoreAction$ } = coreStrings;
      const { previewCourseResourcesTitle$, selectCourseLabel$ } = coursesStrings;

      const currentTopicId = computed(() => route.query.previewTopicId ?? route.params.courseId);

      const previewContentId = computed(() => route.query.previewContentId ?? null);

      // Fetches the topic node and stores it (for title + parent navigation),
      // then returns its children for useFetch to manage as the paginated list.
      // _topicFetchId guards against stale responses
      let _topicFetchId = 0;
      async function loadTopicAndChildren(topicId) {
        _topicFetchId += 1;
        const fetchId = _topicFetchId;
        const newTopic = await ContentNodeResource.fetchTree({ id: topicId });
        if (fetchId === _topicFetchId) {
          topic.value = newTopic;
        }
        return newTopic.children || { results: [] };
      }

      const {
        data: children,
        loading,
        hasMore,
        fetchMore,
        loadingMore,
        fetchData,
      } = useFetch({
        fetchMethod: () => loadTopicAndChildren(currentTopicId.value),
        fetchMoreMethod: more =>
          ContentNodeResource.fetchTree({ id: currentTopicId.value, params: more.params }).then(
            t => t.children || { results: [] },
          ),
      });

      watch(currentTopicId, () => fetchData(), { immediate: true });

      const breadcrumbItems = computed(() => {
        if (!topic.value) {
          return [];
        }
        const ancestors = topic.value.ancestors || [];
        const courseIndex = ancestors.findIndex(a => a.id === route.params.courseId);
        const fromCourse = courseIndex === -1 ? [] : ancestors.slice(courseIndex);
        const items = [...fromCourse, topic.value].map(t => ({
          text: t.title,
          link: getTopicRoute(t.id),
        }));
        // The COURSES_ASSIGN_INDEX course-picker list only exists in the "assign a new
        // course" flow, not when previewing from an already-assigned course's summary
        // page, so this leading crumb is skipped there.
        if (!route.params.courseSessionId) {
          items.unshift({ text: selectCourseLabel$(), link: getCoursesIndexRoute() });
        }
        return items;
      });

      function getTopicRoute(topicId) {
        return overrideRoute(route, {
          query: { previewTopicId: topicId, previewContentId: undefined },
        });
      }

      function getCoursesIndexRoute() {
        return overrideRoute(route, {
          name: PageNames.COURSES_ASSIGN_INDEX,
          query: { previewTopicId: undefined, previewContentId: undefined },
        });
      }

      function getResourceRoute(resourceId) {
        return overrideRoute(route, { query: { previewContentId: resourceId } });
      }

      function exitPreview() {
        const detailsRouteName = route.params.courseSessionId
          ? PageNames.COURSE_SUMMARY_ASSIGN_COURSE_DETAILS
          : PageNames.COURSES_ASSIGN_COURSE_DETAILS;
        router.push(
          overrideRoute(route, {
            name: detailsRouteName,
            query: { previewTopicId: undefined, previewContentId: undefined },
          }),
        );
      }

      function goBackHandler() {
        if (previewContentId.value) {
          router.push(overrideRoute(route, { query: { previewContentId: undefined } }));
        } else if (currentTopicId.value !== route.params.courseId) {
          router.push(getTopicRoute(topic.value.parent));
        } else {
          exitPreview();
        }
      }

      // topic.value isn't reset when a new topic starts fetching, so while loading,
      // or if the fetch fails, it may still hold stale data (or none at all). Hide
      // the back button in both cases rather than navigating to a wrong/missing parent.
      const goBack = computed(() => {
        const isAmbiguousParent = computed(
          () =>
            !previewContentId.value &&
            currentTopicId.value !== route.params.courseId &&
            topic.value?.id !== currentTopicId.value,
        );
        return isAmbiguousParent.value ? null : goBackHandler;
      });

      return {
        topic,
        children,
        loading,
        hasMore,
        fetchMore,
        loadingMore,
        previewContentId,
        breadcrumbItems,
        getTopicRoute,
        getResourceRoute,
        goBack,
        viewMoreAction$,
        previewCourseResourcesTitle$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .topic-header {
    margin-bottom: 16px;
  }

  .topic-title {
    margin: 0;
    font-size: 18px;
  }

  .load-more-button {
    margin-top: 2em;
  }

</style>
