<template>

  <KButton
    :text="$tr('shareFile')"
    @click="share()"
  />

</template>


<script>

  export default {
    name: 'ShareButton',
    props: {
      filename: {
        type: String,
      },
      text: {
        type: String,
      },
    },
    methods: {
      share() {
        document.createElement('img').src =
          'http://localhost:5226/share_by_intent?filename=' +
          this.filename +
          '&msg=' +
          encodeURIComponent(this.text) +
          '&cachebuster=' +
          Math.random();
      },
    },
    $trs: { shareFile: 'Share' },
  };

</script>
