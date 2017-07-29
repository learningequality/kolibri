<template>

  <dropdown-menu
    :name="currentLanguageName"
    :options="languageOptions"
    :inAppBar="inAppBar"
    :displayDisabledAsSelected="true"
    :disabled="disabled"
    type="primary"
    color="primary"
    icon="language"
    @select="switchLanguage"
  />

</template>


<script>

  import orderBy from 'lodash/orderBy';
  import dropdownMenu from 'kolibri.coreVue.components.dropdownMenu';
  import { httpClient } from 'kolibri.client';
  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
  export default {
    name: 'languageSwitcher',
    components: { dropdownMenu },
    computed: {
      languageOptions() {
        return orderBy(availableLanguages, language => language.code, ['asc']).map(language => ({
          id: language.code,
          label: language.name,
          disabled: language.code === currentLanguage,
        }));
      },
      currentLanguageName() {
        return availableLanguages[currentLanguage].name;
      },
    },
    props: {
      inAppBar: {
        type: Boolean,
        default: true,
      },
    },
    data: () => ({
      disabled: false,
    }),
    methods: {
      switchLanguage(language) {
        this.disabled = true;
        const path = this.Kolibri.urls['kolibri:set_language']();
        const entity = {
          language: language.id,
        };
        httpClient({
          path,
          entity,
        }).then(() => {
          global.location.reload(true);
        });
      },
    },
  };

</script>


<style lang="stylus"></style>
