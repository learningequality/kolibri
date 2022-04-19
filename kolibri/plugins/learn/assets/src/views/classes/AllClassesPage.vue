<template>

  <div>
    <KBreadcrumbs :items="breadcrumbs" />
    <YourClasses
      v-if="isUserLoggedIn"
      :classes="classrooms"
    />
    <AuthMessage v-else authorizedRole="learner" />
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import YourClasses from '../YourClasses';
  import { PageNames } from '../../constants';

  export default {
    name: 'AllClassesPage',
    metaInfo() {
      return {
        title: this.coreString('classesLabel'),
      };
    },
    components: {
      KBreadcrumbs,
      AuthMessage,
      YourClasses,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState('classes', ['classrooms']),
      breadcrumbs() {
        return [
          {
            text: this.coreString('homeLabel'),
            link: { name: PageNames.HOME },
          },
          {
            text: this.coreString('classesLabel'),
          },
        ];
      },
    },
  };

</script>


<style lang="scss" scoped></style>
