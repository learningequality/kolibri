<template>

  <p>{{ $tr('cookiesNotificationBanner') }}</p>

</template>


<script>

  export default {
    name: 'CookieBanner',
    $trs: {
      cookiesNotificationBanner: {
        message:
          'We use cookies to improve your experience. By accepting, you agree to our data collection practice.',
      },
    },
  };

</script>
