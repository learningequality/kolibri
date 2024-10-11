<template>

  <ImmersivePage
    :appBarTitle="className"
    :route="$store.getters.facilityPageLinks.ClassEditPage($route.params.id)"
    :loading="isPageLoading"
  >
    <KPageContainer v-if="!isPageLoading">
      <h1>{{ $tr('pageHeader', { className }) }}</h1>
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

  import { mapState, mapActions, mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import ClassEnrollForm from './ClassEnrollForm';

  export default {
    name: 'LearnerClassEnrollmentPage',
    metaInfo() {
      return {
        title: this.$tr('pageHeader', { className: this.className }),
      };
    },
    components: {
      ClassEnrollForm,
      ImmersivePage,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar };
    },
    data() {
      return {
        formIsDisabled: false,
      };
    },
    computed: {
      ...mapGetters(['isPageLoading']),
      ...mapState('classAssignMembers', [
        'class',
        'facilityUsers',
        'totalLearners',
        'totalPageNumber',
      ]),
      className() {
        return this.class.name;
      },
    },
    methods: {
      ...mapActions('classAssignMembers', ['enrollLearnersInClass']),
      enrollLearners(selectedUsers) {
        this.formIsDisabled = true;
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
      pageHeader: {
        message: "Enroll learners into '{className}'",
        context: 'Title of page where users can add (enroll) learners to a class.',
      },
      pageSubheader: {
        message: 'Only showing learners that are not enrolled in this class',
        context: "Description of 'Enroll learners into '{className}'' page.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
