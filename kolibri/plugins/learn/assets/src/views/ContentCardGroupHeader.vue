<template>

  <div>

    <div class="card-group-details">

      <h2 v-if="header" class="card-group-details-header">
        {{ header }}
      </h2>

      <span v-if="showViewMore" class="card-group-details-view-more">
        <KRouterLink :text="$tr('viewMoreFromSectionButton')" :to="viewMorePageLink" />
      </span>

    </div>

  </div>

</template>


<script>

  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';

  export default {
    name: 'ContentCardGroupHeader',
    components: { KRouterLink },
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


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  $header-size: 21px;

  .card-group-details {
    width: 100%;
    margin-top: $header-size;
    margin-bottom: $header-size / 2;
    vertical-align: bottom;
  }

  .card-group-details-header,
  .card-group-details-view-more {
    display: inline-block;
    width: 50%;
  }

  .card-group-details-header {
    margin: 0;
    clear: none;
    font-size: $header-size;
    color: $core-text-default;
    text-align: left;
  }

  .card-group-details-view-more {
    text-align: right;
    text-decoration: underline;
  }

</style>
