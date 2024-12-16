# Preview Kolibri on a mobile device

_Note: This guide focuses on Kolibri as a web app rather than the Android version of Kolibri._

Some tasks may require either an actual or simulated mobile device, such as a phone or tablet.

## Browser development tools

Most browsers provide ways to simulate mobile devices via their development tools. These tools are generally useful for testing:

- Mobile viewports
- Network and CPU throttling
- Touch gestures

Find specific guidance for the browser you are using.

## Real mobile device

Since browser development tools only offer an approximation, some tasks may require you to preview Kolibri on a real mobile device.

### Option 1 (recommended)

1. Ensure that the mobile device you wish to use for previewing Kolibri is connected to the same local network as your computer where you run the development server.
2. Run the development server with `yarn python-devserver` and `yarn run watch --write-to-disk`
3. In the section with URLs in the ``yarn python-devserver`` terminal output, locate Kolibri's ``http://A.B.C.D:8000/`` URL on the first line. Open a browser on the mobile device and navigate to that URL, where you should see Kolibri.

```bash
INFO     2024-11-19 15:14:21,967 Kolibri running on: http://A.B.C.D:8000/ # use this URL
...
INFO     2024-11-19 15:14:21,967 Kolibri running on: http://127.0.0.1:8000/
```

### Option 2

1. Ensure that the mobile device you wish to use for previewing Kolibri is connected to the same local network as your computer where you run the development server.
2. Run the development server with `yarn python-devserver` and `yarn build`
3. In the section with URLs in the ``yarn python-devserver`` terminal output, locate Kolibri's ``http://A.B.C.D:8000/`` URL on the first line. Open a browser on the mobile device and navigate to that URL, where you should see Kolibri.

```bash
INFO     2024-11-19 15:14:21,967 Kolibri running on: http://A.B.C.D:8000/ # use this URL
...
INFO     2024-11-19 15:14:21,967 Kolibri running on: http://127.0.0.1:8000/
```

.. warning::
   When running the development server as described above, you will need to rebuild frontend assets manually using ``yarn build`` after every change.

.. tip::
   Rebuild frontend assets faster by rebuilding only assets related to a plugin where you currently work. For example when developing on files of the Learn plugin, after the initial ``yarn build`` run, for all subsequent rebuilds only run ``yarn exec kolibri-tools build prod -- --plugins kolibri.plugins.learn`` instead of ``yarn build``. Use ``kolibri plugin list`` to see all plugins.

### Troubleshooting

- If you see an indefinite Kolibri loader on your mobile device, double-check that you are not running the development server with `yarn development-hot`. Follow the steps outlined above instead.

- If you cannot access Kolibri at all, check your firewall, VPN, or similar network settings.
