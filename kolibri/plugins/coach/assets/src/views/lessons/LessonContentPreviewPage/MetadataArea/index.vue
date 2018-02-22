<template>

  <div class="description-area">
    <!-- IDEA -a11y- add an invisible title entry in the dl below? -->
    <h1>
      {{ content.title }}
    </h1>
    <dl>
      <!-- h1's are technically not allowed within a dl -->
      <!-- only display what we have, make right portion a slot -->
      <template v-if="description">
        <dt class="visuallyhidden">
          {{ $tr('descriptionDataHeader') }}
        </dt>
        <dd>
          <!-- single-quote wrapped user strings, per indirectlylit -->
          '{{ description }}'
        </dd>
      </template>
      <template v-if="author">
        <dt>
          {{ $tr('authorDataHeader') }}
        </dt>
        <dd>
          '{{ content.author }}'
        </dd>
      </template>
      <template v-if="license">
        <dt>
          {{ $tr('licenseDataHeader') }}
        </dt>
        <dd>
          '{{ content.license_name }}'
          <!-- TODO add description using infoIcon -->
        </dd>
      </template>
      <template v-if="copyrightHolder">
        <dt>
          {{ $tr('copyrightHolderDataHeader') }}
        </dt>
        <dd>
          '{{ content.license_owner }}'
        </dd>
      </template>
    </dl>
  </div>

</template>


<script>

  const keysRequired = ['title'];

  export default {
    name: 'metadataArea',
    $trs: {
      descriptionDataHeader: 'Description',
      authorDataHeader: 'Author',
      licenseDataHeader: 'License',
      copyrightHolderDataHeader: 'Copyright holder',
    },
    props: {
      content: {
        type: Object,
        required: true,
        validator(content) {
          // confirm with designers
          return keysRequired.every(key => content[key]);
        },
      },
    },
    computed: {
      description() {
        return this.content.description;
      },
      author() {
        return this.content.author;
      },
      license() {
        return this.content.license_name;
      },
      licenseInfo() {
        return this.content.license_description;
      },
      copyrightHolder() {
        return this.content.license_owner;
      },
    },
  };

</script>


<style lang="stylus">

  dt, dd
    display: inline-block
    margin: 0

  dt
    &:not(.visuallyhidden):after
      content: ':'

</style>
