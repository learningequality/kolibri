<template>

  <div class="page-footer">
    <ul class="language-list">
      <li
        v-for="language in languageOptions"
        :class="currentLanguage === language.id ? 'selected item' : 'choice item'"
        @click="switchLanguage(language.id)"
      >
        {{ language.lang_name }}
      </li>
    </ul>
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import languageSwitcherMixin from 'kolibri.coreVue.mixins.languageSwitcherMixin';

  export default {
    name: 'languageSwitcherFooter',
    components: {
      kButton,
    },
    mixins: [languageSwitcherMixin],
    $trs: {},
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .choice
    color: $core-action-normal

  .selected
    font-weight: bold

  .page-footer
    padding-left: 32px
    padding-top: 16px
    padding-bottom: 16px
    text-align: center
    button
      float: right
      position: absolute

  .language-list
    list-style: none
    margin: 0
    padding: 0
    text-align: initial
    display: inline-block

  .item
    display: inline-block
    padding-top: 6px
    padding-right: 20px
    &.choice
      cursor: pointer

</style>
