<template>

  <div>
    <p v-if="false">
      {{ $tr('newResource') }}
    </p>
    <p v-if="false">
      {{ $tr('newResourcesInTopic') }}
    </p>
    <p v-if="false">
      {{ $tr('inQueueForImport') }}
    </p>
  </div>

</template>


<script>

  export default {
    name: 'ChannelUpdateAnnotations',
    components: {},
    mixins: [],
    props: {},
    data() {
      return {};
    },
    computed: {},
    methods: {},
    $trs: {
      newResource: {
        message: 'New',
        context: 'Label that is shown with resources that were added after upgrading the channel',
      },
      newResourcesInTopic: {
        message: '{count} {count, plural, one {new} other {new}}',
        context:
          'Label that is shown on topics with resources that were added after upgrading the channel',
      },
      inQueueForImport: {
        message: 'In queue for import',
        context:
          'Label that is with resources that are not selectable for import since they are being re-downloaded after upgrading the channel',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
