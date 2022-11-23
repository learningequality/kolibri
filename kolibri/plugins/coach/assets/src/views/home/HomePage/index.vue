<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <AppBarPage
      :title="appBarTitle"
    >
      <template #subNav>
        <TopNavbar />
      </template>

      <KGrid gutter="16">
        <KGridItem>
          <OverviewBlock />
        </KGridItem>
        <KGridItem :layout12="{ span: 6 }">
          <KGrid gutter="16">
            <KGridItem>
              <QuizzesBlock />
            </KGridItem>
            <KGridItem>
              <LessonsBlock />
            </KGridItem>
          </KGrid>
        </KGridItem>
        <KGridItem :layout12="{ span: 6 }">
          <ActivityBlock />
        </KGridItem>
      </KGrid>
    </AppBarPage>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import useKolibriPageTitle from 'kolibri-common/composables/useKolibriPageTitle';
  import commonCoach from '../../common';
  import useCoreCoach from '../../../composables/useCoreCoach';
  import OverviewBlock from './OverviewBlock';
  import ActivityBlock from './ActivityBlock';
  import LessonsBlock from './LessonsBlock';
  import QuizzesBlock from './QuizzesBlock';

  export default {
    name: 'HomePage',
    metaInfo() {
      return this.getKolibriMetaInfo(this.pageTitle, this.error);
    },
    components: {
      AppBarPage,
      NotificationsRoot,
      OverviewBlock,
      ActivityBlock,
      LessonsBlock,
      QuizzesBlock,
    },
    mixins: [commonCoach],
    setup() {
      const { pageTitle, appBarTitle } = useCoreCoach();
      const { getKolibriMetaInfo } = useKolibriPageTitle();

      return {
        pageTitle,
        appBarTitle,
        getKolibriMetaInfo,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .new-coach-block {
    min-width: 0;
  }

</style>
