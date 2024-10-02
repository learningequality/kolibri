import { Resource } from 'kolibri.lib.apiResource';

/**
 * @example Get ContentNode from a local USB drive for the purposes of importing from that drive.
 * ContentNodeGranular.getModel(id, { importing_from_drive_id: 'drive_1' }).fetch();
 *
 * @example Get ContentNode from a remote channel (whose content DB has been downloaded).
 * OR exporting to a USB drive.
 * ContentNodeGranular.getModel(id).fetch();
 *
 * Note: if the top-level of the channel is desired, then `id` must be the channels's `root` id.
 */
export default new Resource({
  name: 'contentnode_granular',
});
