<template>

  <LearnAppBarPage
    :appBarTitle="learnString('learnLabel')"
    :loading="pageLoading"
  >
    <KBreadcrumbs
      :items="breadcrumbs"
      :ariaLabel="learnString('classesAndAssignmentsLabel')"
    />
    <YourClasses
      v-if="isUserLoggedIn"
      :classes="classrooms"
      :loading="pageLoading"
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
  import commonCoreStrings, { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';
  import usePageTitle from 'kolibri/composables/usePageTitle';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import YourClasses from '../YourClasses';
  import { PageNames } from '../../constants';
  import commonLearnStrings from '../commonLearnStrings';
  import LearnAppBarPage from '../LearnAppBarPage';

  export default {
    name: 'AllClassesPage',
    components: {
      KBreadcrumbs,
      AuthMessage,
      YourClasses,
      LearnAppBarPage,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      const { isUserLoggedIn } = useUser();
      usePageTitle(coreStrings.classesLabel$, { hasVisibleHeading: !isUserLoggedIn.value });
      return {
        isUserLoggedIn,
        pageLoading,
      };
    },
    computed: {
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
