import { createTranslator } from 'kolibri/utils/i18n';

export const connectDevicesStrings = createTranslator('ConnectDevicesStrings', {
  title: {
    message: 'Help learners get connected',
    context:
      'Title of the window, and label of the button that opens it, showing how other devices can connect to this Kolibri server.',
  },
  scanHeading: {
    message: 'Scan to connect',
    context: 'Heading above a QR code that opens this Kolibri server on a phone or tablet.',
  },
  scanDescription: {
    message: 'Scan this code with the camera of a phone or tablet on the same network.',
    context: 'Instructions under the "Scan to connect" heading.',
  },
  qrAlt: {
    message: 'QR code for the address below',
    context:
      'Alt text for a QR code image. The address it encodes is shown as text directly below it.',
  },
  bookmarkHeading: {
    message: 'Bookmark this address',
    context:
      'Heading above web addresses of this Kolibri server that stay the same over time, such as kolibri.local.',
  },
  bookmarkDescription: {
    message:
      'These addresses do not change. Open one in the browser on each device and bookmark it. Some older Android devices cannot open them.',
    context: 'Explains the addresses under the "Bookmark this address" heading.',
  },
  androidHeading: {
    message: 'Android devices',
    context: 'Heading above guidance for connecting Android phones and tablets.',
  },
  androidDescription: {
    message:
      'Install the Kolibri app from the Google Play Store. The app finds this server automatically.',
    context: 'Guidance under the "Android devices" heading.',
  },
  ipHeading: {
    message: 'Network addresses',
    context: 'Heading above the IP address web addresses of this Kolibri server.',
  },
  ipDescription: {
    message:
      'These addresses can change over time, for example when this device restarts or joins another network.',
    context: 'Explains the addresses under the "Network addresses" heading.',
  },
  noNetwork: {
    message:
      'This device is not connected to a network. Connect it to a network so other devices can reach it.',
    context: 'Shown instead of connection details when the Kolibri server has no network address.',
  },
  fetchError: {
    message: 'Could not load the connection details. Kolibri will keep trying.',
    context: 'Shown instead of connection details when they could not be loaded from the server.',
  },
});
