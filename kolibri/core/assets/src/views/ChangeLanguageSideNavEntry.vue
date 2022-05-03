<template>

  <CoreMenuOption
    :label="$tr('languageSwitchMenuOption')"
    icon="language"
    @select="handleShowLanguageModal()"
  />

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';

  export default {
    name: 'ChangeLanguageSideNavEntry',
    components: {
      CoreMenuOption,
    },
    methods: {
      handleShowLanguageModal() {
        this.$emit('openLanguageModal');
      },
    },
    $trs: {
      languageSwitchMenuOption: {
        message: 'Change language',
        context:
          'General user setting where a user can choose the language they want to view the Kolibri interface in.',
      },
    },
    role: UserKinds.LEARNER,
    priority: 100,
  };

</script>
