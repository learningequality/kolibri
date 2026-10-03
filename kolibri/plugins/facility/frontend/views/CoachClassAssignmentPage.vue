<template>

  <ImmersivePage
    :appBarTitle="className"
    :route="$store.getters.facilityPageLinks.ClassEditPage($route.params.id)"
    :loading="pageLoading"
  >
    <KPageContainer v-if="!pageLoading">
      <h1>{{ pageHeader }}</h1>
      <p>{{ $tr('pageSubheader') }}</p>
      <ClassEnrollForm
        :facilityUsers="facilityUsers"
        :totalPageNumber="totalPageNumber"
        :totalUsers="totalLearners"
        pageType="coaches"
        :disabled="formIsDisabled"
        @submit="assignCoaches"
      />
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { computed } from 'vue';
  import { mapState, mapActions } from 'vuex';
  import { createTranslator } from 'kolibri/utils/i18n';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import usePageTitle from 'kolibri/composables/usePageTitle';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import store from '../store';
  import ClassEnrollForm from './ClassEnrollForm';

  const pageTitleStrings = createTranslator('CoachClassAssignmentPage', {
    pageHeader: {
      message: "Assign a coach to '{className}'",
      context:
        "Title of the coach assignment page where a user can assign a coach to a class.\n\nThis is accessed via the  'Assign coaches' button on the Facility > Classes page.",
    },
  });

  export default {
    name: 'CoachClassAssignmentPage',
    components: {
      ClassEnrollForm,
      ImmersivePage,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      const className = computed(() => store.state.classAssignMembers.class.name);
      const pageHeader = computed(() =>
        pageTitleStrings.pageHeader$({ className: className.value }),
      );
      usePageTitle(pageHeader, { hasVisibleHeading: true });
      return { createSnackbar, pageLoading, className, pageHeader };
    },
    data() {
      return {
        formIsDisabled: false,
      };
    },
    computed: {
      ...mapState('classAssignMembers', [
        'class',
        'facilityUsers',
        'totalLearners',
        'totalPageNumber',
      ]),
    },
    methods: {
      ...mapActions('classAssignMembers', ['assignCoachesToClass']),
      assignCoaches(coaches) {
        this.formIsDisabled = true;
        this.assignCoachesToClass({ classId: this.class.id, coaches })
          .then(() => {
            // do this in action?
            this.$router
              .push(this.$store.getters.facilityPageLinks.ClassEditPage(this.class.id))
              .then(() => {
                this.showSnackbarNotification('coachesAssignedNoCount', { count: coaches.length });
              });
          })
          .catch(() => {
            this.formIsDisabled = false;
            this.createSnackbar(this.coreString('changesNotSavedNotification'));
          });
      },
    },
    $trs: {
      pageSubheader: {
        message: 'Showing coaches that are not assigned to this class',
        context:
          "Description of the coach assignment page where a user can assign coaches to a class.\n\nThis is accessed via the  'Assign coaches' button on the Facility > Classes page.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
