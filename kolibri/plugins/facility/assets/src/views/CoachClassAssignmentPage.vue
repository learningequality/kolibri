<template>

  <ImmersivePage
    :appBarTitle="className"
    :route="$store.getters.facilityPageLinks.ClassEditPage($route.params.id)"
  >
    <KPageContainer>
      <h1>{{ $tr('pageHeader', { className }) }}</h1>
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

  import { mapState, mapActions } from 'vuex';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ClassEnrollForm from './ClassEnrollForm';

  export default {
    name: 'CoachClassAssignmentPage',
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
      className() {
        return this.class.name;
      },
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
            this.$store.dispatch('createSnackbar', this.coreString('changesNotSavedNotification'));
          });
      },
    },
    $trs: {
      pageHeader: {
        message: "Assign a coach to '{className}'",
        context:
          "Title of the coach assignment page where a user can assign a coach to a class.\n\nThis is accessed via the  'Assign coaches' button on the Facility > Classes page.",
      },
      pageSubheader: {
        message: 'Showing coaches that are not assigned to this class',
        context:
          "Description of the coach assignment page where a user can assign coaches to a class.\n\nThis is accessed via the  'Assign coaches' button on the Facility > Classes page.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
