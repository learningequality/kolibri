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
        :disabled="formIsDisabled"
        :totalPageNumber="totalPageNumber"
        :totalUsers="totalLearners"
        pageType="learners"
        @submit="enrollLearners"
      />
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { computed } from 'vue';
  import { mapState, mapActions } from 'vuex';
  import { createTranslator } from 'kolibri/utils/i18n';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import usePageTitle from 'kolibri/composables/usePageTitle';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import store from '../store';
  import ClassEnrollForm from './ClassEnrollForm';

  export const pageTitleStrings = createTranslator('LearnerClassEnrollmentPage', {
    pageHeader: {
      message: "Enroll learners into '{className}'",
      context: 'Title of page where users can add (enroll) learners to a class.',
    },
  });

  export default {
    name: 'LearnerClassEnrollmentPage',
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
      ...mapActions('classAssignMembers', ['enrollLearnersInClass']),
      enrollLearners(selectedUsers) {
        this.formIsDisabled = true;
        const welcomeDismissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';
        selectedUsers.forEach(id => {
          window.localStorage.setItem(`${welcomeDismissalKey}-${id}`, false);
        });
        this.enrollLearnersInClass({ classId: this.class.id, users: selectedUsers })
          .then(() => {
            this.$router
              .push(this.$store.getters.facilityPageLinks.ClassEditPage(this.class.id))
              .then(() => {
                this.showSnackbarNotification('learnersEnrolledNoCount', {
                  count: selectedUsers.length,
                });
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
        message: 'Only showing learners that are not enrolled in this class',
        context: "Description of 'Enroll learners into '{className}'' page.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
