<template>

  <KPageContainer>
    <h1>{{ $tr('pageHeader', { className }) }}</h1>
    <p>{{ $tr('pageSubheader') }}</p>
    <ClassEnrollForm
      :facilityUsers="facilityUsers"
      :classUsers="classUsers"
      @submit="assignCoaches"
    />
  </KPageContainer>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
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
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapState('classAssignMembers', ['class', 'classUsers', 'facilityUsers']),
      className() {
        return this.class.name;
      },
    },
    methods: {
      ...mapActions('classAssignMembers', ['assignCoachesToClass']),
      assignCoaches(coaches) {
        this.assignCoachesToClass({ classId: this.class.id, coaches }).then(() => {
          // do this in action?
          this.$router.push(this.$store.getters.facilityPageLinks.ClassEditPage).then(() => {
            this.showSnackbarNotification('coachesAssignedNoCount', { count: coaches.length });
          });
        });
      },
    },
    $trs: {
      pageHeader: "Assign a coach to '{className}'",
      pageSubheader: 'Showing coaches that are not assigned to this class',
    },
  };

</script>


<style lang="scss" scoped></style>
