<template>

  <CoachAppBarPage>
    <KPageContainer>
      <KCircularLoader v-if="loading" />
      <h1 v-else>Sup?</h1>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { computed, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import CoachAppBarPage from '../CoachAppBarPage.vue';

  export default {
    name: 'CourseSummaryPage',
    components: {
      CoachAppBarPage,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();
      const course = ref(null);
      const loading = ref(true);
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
      };
    },
  };

</script>
