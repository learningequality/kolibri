<template>

  <LearnAppBarPage :appBarTitle="learnString('learnLabel')">
    <KBreadcrumbs
      :items="breadcrumbs"
      :ariaLabel="learnString('classesAndAssignmentsLabel')"
    />
    <YourClasses
      v-if="isUserLoggedIn"
      :classes="classrooms"
      :loading="loading"
    />
    <AuthMessage
      v-else
      authorizedRole="learner"
    />
  </LearnAppBarPage>

</template>


<script>

  import { mapState } from 'vuex';
  import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
  import AuthMessage from 'kolibri/components/AuthMessage';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';
  import YourClasses from '../YourClasses';
  import { PageNames } from '../../constants';
  import commonLearnStrings from './../commonLearnStrings';
  import LearnAppBarPage from './../LearnAppBarPage';

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
      LearnAppBarPage,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      const { isUserLoggedIn } = useUser();
      return {
        isUserLoggedIn,
      };
    },
    computed: {
      ...mapState('classes', ['classrooms']),
      ...mapState({
        loading: state => state.core.loading,
      }),
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
