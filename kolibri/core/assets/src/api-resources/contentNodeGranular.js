import { Resource } from '../api-resource';

/**
 * @example Get ContentNode from a local USB drive for the purposes of importing from that drive.
 * ContentNodeGranular.getModel(pk).fetch({ import_export: 'import', drive_id: 'drive_1' });
 *
 * @example Get ContentNode from a remote channel (whose content DB has been downloaded).
 * ContentNodeGranular.getModel(pk).fetch({ import_export: 'import' });
 *
 * @example Get ContentNode from a local channel for the purposes of exporting to a USB drive.
 * ContentNodeGranular.getModel(pk).fetch({ import_export: 'export' });
 *
 * Note: if the top-level of the channel is desired, then `pk` must be the channels's `root` id.
 */
export default class ContentNodeGranularResource extends Resource {
  static resourceName() {
    return 'contentnode_granular';
  }

  static idKey() {
    return 'pk';
  }

  // Given a node ID, returns the {total_file_size, on_device_file_size}
  filesizes(nodeId) {
    return this.client({
      path: this.urls[`${this.name}-filesizes`](),
      entity: {
        pk: nodeId,
      },
    });
  }
}
