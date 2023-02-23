<template>

  <CoreMenuOption
    :label="coreString('myDownloadsLabel')"
    :link="url"
    icon="download"
  />

</template>


<script>

  import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'MyDownloadsSideNavEntry',
    components: {
      CoreMenuOption,
    },
    mixins: [commonCoreStrings],
    computed: {
      url() {
        return urls['kolibri:kolibri.plugins.learn:my_downloads']();
      },
    },
    role: UserKinds.LEARNER,
    priority: 10,
    section: NavComponentSections.ACCOUNT,
  };

  navComponents.register(component);

  export default component;

</script>
