<template>

  <div>

    <div class="card-group-details">

      <h2 v-if="header" class="card-group-details-header" :style="{ color: $themeTokens.text }">
        {{ header }}
      </h2>

      <span v-if="showViewMore" class="card-group-details-view-more">
        <KRouterLink :text="coreString('viewMoreAction')" :to="viewMorePageLink" />
      </span>

    </div>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ContentCardGroupHeader',
    mixins: [commonCoreStrings],
    props: {
      header: { type: String },
      viewMorePageLink: { type: Object },
      showViewMore: { type: Boolean },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

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
    text-align: left;
  }

  .card-group-details-view-more {
    text-align: right;
    text-decoration: underline;
  }

</style>
