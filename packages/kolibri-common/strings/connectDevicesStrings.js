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
  qrAlt: {
    message: 'QR code for the address below',
    context:
      'Alt text for a QR code image. The address it encodes is shown as text directly below it.',
  },
  bookmarkHeading: {
    message: 'Bookmark this',
    context:
      'Heading above web addresses of this Kolibri server that stay the same over time, such as kolibri.local.',
  },
  ipHeading: {
    message: 'Network addresses (these can change)',
    context: 'Heading above the IP address web addresses of this Kolibri server.',
  },
  noNetwork: {
    message: 'This device is not connected to a network.',
    context: 'Shown instead of connection details when the Kolibri server has no network address.',
  },
  fetchError: {
    message: 'Could not load the connection details.',
    context: 'Shown instead of connection details when they could not be loaded from the server.',
  },
});
