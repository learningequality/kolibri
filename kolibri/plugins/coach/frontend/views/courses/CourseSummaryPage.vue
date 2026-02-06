<template>

  <CoachAppBarPage>
    <KPageContainer class='container'>
      <KCircularLoader v-if="loading" />
      <div v-else class='header'>
        <KButton class='go-back' text='<- Back' appearance="basic-link" />
        <CoachHeader  hideClassName :title="course?.title">
          <template #actions>
            <KButton text="Options" >
              <template #menu>
                <KDropdownMenu
                  :options="[]"
                  maxWidth="none"
                  @select="() => null"
                />
              </template>
            </KButton>
          </template>
        </CoachHeader>
      </div>
      <div class="content">
        <section class="course-status">
          oh snap
        </section>
        <section class="course-details">
          <KTabsList
            ref="tabList"
            tabsId="courseTabs"
            :activeTabId="activeTabId"
            :tabs="tabs"
            @click="id => activeTabId = id"
          />
          <KTabsPanel
            tabsId="courseTabs"
            :activeTabId="activeTabId"
          >
            <template #[TABS.UNITS]>
              <h1> unit </h1>
            </template>
            <template #[TABS.LEARNERS]>
              <h1> learners </h1>
            </template>
            <template #[TABS.OBJECTIVES]>
              <h1> objectives </h1>
            </template>
          </KTabsPanel>
        </section>
      </div>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { computed, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import CoachHeader from '../common/CoachHeader.vue';
  import CoachAppBarPage from '../CoachAppBarPage.vue';

  export default {
    name: 'CourseSummaryPage',
    components: {
      CoachAppBarPage,
      CoachHeader,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();
      const course = ref(null);
      const units = computed(() => course.value?.children?.results);
      const loading = ref(true);
      const TABS = { UNITS: 'units', LEARNERS: 'learners', OBJECTIVES: 'objectives' };
      const tabs = [
        {
          id: TABS.UNITS,
          label: "_UNITS_",
        },
        {
          id: TABS.LEARNERS,
          label: "_LEARNERS_",
        },
        {
          id: TABS.OBJECTIVES,
          label: "_OBJECTIVES_",
        },
      ];
      const activeTabId = ref(TABS.UNITS);
      ContentNodeResource.fetchTree({ id: route.params.courseId })
        .then(results => {
          course.value = results;
          loading.value = false;
        })
        .catch(() => {
          loading.value = false;
        });
      return {
        loading,
        course,
        units,
        tabs,
        TABS,
        activeTabId,
      };
    },
  };

</script>


<style scoped>

.container {
  padding: 0 0 8px 0;

  .header {
    padding: 8px 24px 24px;
  }
}

.go-back {
  margin-top: 16px;
}

.content {
  display: flex;
  width: 100%;
}

.course-status {
  width: 190px;
  padding: 24px 16px 24px 24px;
}
.course-details {
  width: calc(100% - 190px);
}

</style>
