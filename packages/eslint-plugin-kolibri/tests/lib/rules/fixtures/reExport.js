// Test fixture with separate declaration and export
import { createTranslator } from 'kolibri/utils/i18n';

const reExportedStrings = createTranslator('ReExportNamespace', {
  reExportedMessage: 'This is re-exported',
  anotherReExported: 'Another re-exported message',
});

export { reExportedStrings };
