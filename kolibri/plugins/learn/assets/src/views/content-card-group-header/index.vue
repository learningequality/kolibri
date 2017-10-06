<template>

  <div>

      <div class="card-group-details">

        <h2 v-if="header" class="card-group-details-header">
          {{ header }}
        </h2>

        <span v-if="showViewMore" class="card-group-details-view-more">
          <k-router-link :text="$tr('viewMoreFromSectionButton')" :to="viewMorePageLink" />
        </span>

      </div>

  </div>

</template>


<script>

  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';

  export default {
    name: 'contentCardGroupHeader',
    components: { kRouterLink },
    $trs: {
      viewMoreFromSectionButton: 'View more',
    },
    props: {
      header: { type: String },
      viewMorePageLink: { type: Object },
      showViewMore: { type: Boolean },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $header-size = 21px

  .card-group-details
    width: 100%
    vertical-align: bottom
    margin-top: $header-size
    margin-bottom: ($header-size / 2)

    &-header, &-view-more
      width: 50%
      display: inline-block

    &-header
      text-align: left
      clear: none
      color: $core-text-default
      font-size: $header-size
      margin: 0

    &-view-more
      text-decoration: underline
      text-align: right

</style>
