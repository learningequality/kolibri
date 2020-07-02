<template>

  <KPageContainer>
    <h1>{{ $tr('pageHeader', { className }) }}</h1>
    <p>{{ $tr('pageSubheader') }}</p>
    <ClassEnrollForm
      :facilityUsers="facilityUsers"
      :classUsers="classUsers"
      @submit="enrollLearners"
    />
  </KPageContainer>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapState('classAssignMembers', ['class', 'facilityUsers', 'classUsers']),
      className() {
        return this.class.name;
      },
    },
    methods: {
      ...mapActions('classAssignMembers', ['enrollLearnersInClass']),
      enrollLearners(selectedUsers) {
        this.enrollLearnersInClass({ classId: this.class.id, users: selectedUsers }).then(() => {
          this.$router.push(this.$store.getters.facilityPageLinks.ClassEditPage).then(() => {
            this.showSnackbarNotification('learnersEnrolledNoCount', {
              count: selectedUsers.length,
            });
          });
        });
      },
    },
    $trs: {
      pageHeader: "Enroll learners into '{className}'",
      pageSubheader: 'Only showing learners that are not enrolled in this class',
    },
  };

</script>


<style lang="scss" scoped></style>
