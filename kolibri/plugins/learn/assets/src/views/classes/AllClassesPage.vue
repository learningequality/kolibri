<template>

  <div>
    <YourClasses
      v-if="isUserLoggedIn"
      :classes="classrooms"
    />
    <AuthMessage v-else authorizedRole="learner" />
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import YourClasses from '../YourClasses';

  export default {
    name: 'AllClassesPage',
    metaInfo() {
      return {
        title: this.coreString('classesLabel'),
      };
    },
    components: {
      AuthMessage,
      YourClasses,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState('classes', ['classrooms']),
    },
  };

</script>


<style lang="scss" scoped></style>
