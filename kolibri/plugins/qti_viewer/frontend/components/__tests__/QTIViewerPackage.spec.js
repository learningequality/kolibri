import { TextEncoder, TextDecoder } from 'node:util';

import { render, screen, waitFor } from '@testing-library/vue';
import { createZipBytes } from 'kolibri-zip';
import client from 'kolibri/client';
// eslint-disable-next-line import-x/named
import useContentViewer, { useContentViewerMock } from 'kolibri/composables/useContentViewer';
import items from '../__fixtures__/items';
import QTIViewer from '../QTIViewer.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/composables/useContentViewer');

// Node's implementations; jsdom's do not round-trip binary content correctly.
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

let objectUrlCounter = 0;
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = () => `blob:package/${(objectUrlCounter += 1)}`;
}

const ITEM_ID = 'q2-choice-interaction-single-sv-1';
const ITEM_XML = items[ITEM_ID].xml;
const CHOICE_TEXT = 'You must stay with your luggage at all times.';

const MANIFEST_XML = `<?xml version="1.0" encoding="UTF-8"?>
  <manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" identifier="manifest-${ITEM_ID}">
    <resources>
      <resource identifier="${ITEM_ID}" type="imsqti_item_xmlv3p0" href="${ITEM_ID}.xml">
        <file href="${ITEM_ID}.xml" />
      </resource>
    </resources>
  </manifest>`;

function serveZip(bytes) {
  class FakeXHR {
    constructor() {
      this._listeners = {};
      this.status = 200;
    }
    open() {}
    addEventListener(type, listener) {
      this._listeners[type] = this._listeners[type] || [];
      this._listeners[type].push(listener);
    }
    getResponseHeader(name) {
      return name === 'Content-Length' ? String(bytes.length) : null;
    }
    send() {
      this.response = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      Promise.resolve().then(() => (this._listeners.load || []).forEach(listener => listener()));
    }
  }
  FakeXHR.HEADERS_RECEIVED = 2;
  global.XMLHttpRequest = FakeXHR;
}

describe('QTIViewer served a package zip', () => {
  let registeredApi;
  let checksAtStartTracking;

  const Harness = {
    components: { QTIViewer },
    methods: {
      onStartTracking() {
        checksAtStartTracking.push(registeredApi.checkAnswer());
      },
    },
    template: '<QTIViewer @startTracking="onStartTracking" />',
  };

  beforeEach(async () => {
    registeredApi = null;
    checksAtStartTracking = [];
    client.__setPayload(ITEM_XML);
    serveZip(
      await createZipBytes({
        'imsmanifest.xml': MANIFEST_XML,
        [`${ITEM_ID}.xml`]: ITEM_XML,
      }),
    );
    useContentViewer.mockImplementation(() => ({
      ...useContentViewerMock({
        defaultFile: { storage_url: 'package.zip' },
        itemId: ITEM_ID,
        interactive: true,
      }),
      registerAssessmentApi: api => {
        registeredApi = api;
      },
    }));
  });

  it('defers startTracking until the item it announces can be answered', async () => {
    render(Harness);
    await waitFor(() => expect(screen.getByText(CHOICE_TEXT)).toBeInTheDocument());

    expect(checksAtStartTracking).toEqual([expect.objectContaining({ outcomes: { SCORE: 0 } })]);
  });
});
