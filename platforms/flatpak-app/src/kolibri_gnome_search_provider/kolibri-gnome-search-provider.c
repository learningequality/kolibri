/* kolibri-gnome-search-provider.c
 *
 * Copyright 2021 Endless OS Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE X CONSORTIUM BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Except as contained in this notice, the name(s) of the above copyright
 * holders shall not be used in advertising or otherwise to promote the sale,
 * use or other dealings in this Software without prior written
 * authorization.
 *
 * SPDX-License-Identifier: MIT
 *
 * Author: Dylan McCall <dylan@endlessos.org>
 */

#include "kolibri-gnome-search-provider.h"

#include "config.h"
#include "kolibri-daemon-dbus.h"
#include "kolibri-daemon-dbus-utils.h"
#include "kolibri-task-multiplexer.h"
#include "kolibri-utils.h"
#include "shell-search-provider-dbus.h"

#include <gio/gdesktopappinfo.h>

struct _KolibriGnomeSearchProvider {
  GObject parent;

  ShellSearchProvider2 *search_provider_skeleton;
  KolibriDaemonMain *kolibri_daemon;
  guint base_registration_id;
  guint subtree_registration_id;

  KolibriTaskMultiplexer *search_multiplexer;
  gchar *search_multiplexer_query;
};

G_DEFINE_TYPE(KolibriGnomeSearchProvider, kolibri_gnome_search_provider, G_TYPE_OBJECT)

enum {
  SEARCH_PROVIDER_METHOD_CALLED,
  _SEARCH_PROVIDER_LAST_SIGNAL
};

static guint search_provider_signals[_SEARCH_PROVIDER_LAST_SIGNAL];

typedef enum {
  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR_INVALID_ITEM_ID,
  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR_INVALID_NODE_PATH,
  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR_WRONG_CHANNEL,
} KolibriGnomeSearchProviderError;

G_DEFINE_QUARK(kolibri-gnome-search-provider-error-quark, kolibri_gnome_search_provider_error)
#define KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR (kolibri_gnome_search_provider_error_quark())

#define SEARCH_PROVIDER_CHANNEL_NODE_PREFIX "channel_"
#define SEARCH_PROVIDER_CHANNEL_OBJECT_PATH_PREFIX SEARCH_PROVIDER_OBJECT_PATH "/" SEARCH_PROVIDER_CHANNEL_NODE_PREFIX

static void
kolibri_gnome_search_provider_dispose(GObject *gobject)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(gobject);

  g_clear_pointer(&self->search_provider_skeleton, g_object_unref);
  g_clear_pointer(&self->kolibri_daemon, g_object_unref);
  g_clear_pointer(&self->search_multiplexer, g_object_unref);

  G_OBJECT_CLASS(kolibri_gnome_search_provider_parent_class)->dispose(gobject);
}

static void
kolibri_gnome_search_provider_finalize(GObject *gobject)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(gobject);

  g_free(self->search_multiplexer_query);

  G_OBJECT_CLASS(kolibri_gnome_search_provider_parent_class)->finalize(gobject);
}

static void
kolibri_gnome_search_provider_class_init(KolibriGnomeSearchProviderClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS(klass);

  object_class->dispose = kolibri_gnome_search_provider_dispose;
  object_class->finalize = kolibri_gnome_search_provider_finalize;

  search_provider_signals[SEARCH_PROVIDER_METHOD_CALLED] = g_signal_new("method-called",
                                                                        G_TYPE_FROM_CLASS(klass),
                                                                        G_SIGNAL_RUN_LAST,
                                                                        0,
                                                                        NULL,
                                                                        NULL,
                                                                        NULL,
                                                                        G_TYPE_NONE,
                                                                        0,
                                                                        NULL);
}

static void
kolibri_gnome_search_provider_init(KolibriGnomeSearchProvider *self)
{
  self->search_provider_skeleton = NULL;
  self->kolibri_daemon = NULL;
  self->base_registration_id = 0;
  self->subtree_registration_id = 0;
  self->search_multiplexer = NULL;
  self->search_multiplexer_query = NULL;
}

static gchar *
get_channel_id_for_invocation(GDBusMethodInvocation *invocation)
{
  // owned by invocation
  const gchar *object_path = g_dbus_method_invocation_get_object_path(invocation);
  gchar *channel_id = NULL;

  if (g_str_has_prefix(object_path, SEARCH_PROVIDER_CHANNEL_OBJECT_PATH_PREFIX))
    channel_id = g_strdup(object_path + sizeof(SEARCH_PROVIDER_CHANNEL_OBJECT_PATH_PREFIX) - 1);

  return channel_id;
}

static gboolean
parse_item_id(const gchar  *item_id,
              gchar       **out_node_path,
              gchar       **out_node_context,
              GError      **error)
{
  g_auto(GStrv) item_id_split = NULL;

  if (item_id == NULL)
    {
      *out_node_path = NULL;
      *out_node_context = NULL;
      return TRUE;
    }

  item_id_split = g_strsplit(item_id, "?", 2);

  if (g_strv_length(item_id_split) != 2)
    {
      g_set_error(error,
                  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR,
                  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR_INVALID_ITEM_ID,
                  "%s is not a valid item id",
                  item_id);
      return FALSE;
    }

  *out_node_path = g_strdup(item_id_split[0]);
  *out_node_context = g_strdup(item_id_split[1]);

  return TRUE;
}

static gboolean
parse_node_path(const gchar  *node_path,
                gchar       **out_node_kind,
                gchar       **out_node_id,
                GError      **error)
{
  g_auto(GStrv) node_path_split = NULL;

  if (node_path == NULL)
    {
      *out_node_kind = NULL;
      *out_node_id = NULL;
      return TRUE;
    }

  node_path_split = g_strsplit(node_path, "/", 2);

  if (g_strv_length(node_path_split) != 2)
    {
      g_set_error(error,
                  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR,
                  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR_INVALID_NODE_PATH,
                  "%s is not a valid node path",
                  node_path);
      return FALSE;
    }

  *out_node_kind = g_strdup(node_path_split[0]);
  *out_node_id = g_strdup(node_path_split[1]);

  return TRUE;
}

static void
kolibri_daemon_get_metadata_for_item_ids_async_ready_cb(GObject      *source_object,
                                                        GAsyncResult *res,
                                                        gpointer user_data)
{
  KolibriDaemonMain *kolibri_daemon = KOLIBRI_DAEMON_MAIN(source_object);
  GDBusMethodInvocation *invocation = G_DBUS_METHOD_INVOCATION(user_data);

  g_autoptr(GError) error = NULL;
  g_autoptr(GVariant) metas = NULL;

  kolibri_daemon_main_call_get_metadata_for_item_ids_finish(kolibri_daemon,
                                                            &metas,
                                                            res,
                                                            &error);

  if (error)
    {
      g_dbus_method_invocation_return_gerror(invocation, error);
      return;
    }

  g_dbus_method_invocation_return_value(invocation, g_variant_new_tuple(&metas, 1));
}

static gboolean
build_kolibri_dispatch_uri(const gchar  *channel_id,
                           const gchar  *item_id,
                           const gchar  *query,
                           GUri        **out_kolibri_uri,
                           GError      **error)
{
  g_autoptr(GUri) kolibri_uri = NULL;
  g_autofree gchar *node_path = NULL;
  g_autofree gchar *node_context = NULL;
  g_autofree gchar *uri_query = NULL;
  g_autofree gchar *uri_path = NULL;

  if (!parse_item_id(item_id, &node_path, &node_context, error))
    return FALSE;

  if (item_id != NULL && channel_id != NULL && g_strcmp0(node_context, channel_id) != 0)
    {
      g_set_error(error,
                  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR,
                  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR_WRONG_CHANNEL,
                  "item id %s does not belong in channel %s",
                  item_id,
                  channel_id);
      return FALSE;
    }

  if (query != NULL)
    uri_query = g_strdup_printf("search=%s", query);

  if (node_path != NULL)
    uri_path = g_strconcat("/", node_path, NULL);

  kolibri_uri = g_uri_build(G_URI_FLAGS_NONE,
                            DISPATCH_URI_SCHEME,
                            NULL,
                            channel_id,
                            -1,
                            uri_path != NULL ? uri_path : "",
                            uri_query,
                            NULL);

  if (out_kolibri_uri)
    *out_kolibri_uri = g_steal_pointer(&kolibri_uri);

  return TRUE;
}

static gboolean
activate_kolibri(const gchar  *channel_id,
                 const gchar  *item_id,
                 const gchar  *query,
                 GError      **error)
{
  g_autoptr(GDesktopAppInfo) app_info = NULL;
  g_autoptr(GUri) kolibri_uri = NULL;
  g_autolist(gchar) uris_list = NULL;

  // We use the x-kolibri-dispatch URI scheme with kolibri-launcher, which is
  // able to launch Kolibri with a particular channel ID. Internally, it passes
  // a kolibri URI to either the default Kolibri application instance or a
  // channel specific one.

  if (!build_kolibri_dispatch_uri(channel_id, item_id, query, &kolibri_uri, error))
    return FALSE;

  app_info = g_desktop_app_info_new(LAUNCHER_APPLICATION_ID ".desktop");
  uris_list = g_list_append(uris_list, g_uri_to_string(kolibri_uri));

  return g_app_info_launch_uris(G_APP_INFO(app_info),
                                uris_list,
                                NULL,
                                error);
}

static gboolean
kolibri_gnome_search_provider_can_attach_search(KolibriGnomeSearchProvider *self,
                                                const gchar *query)
{
  return !kolibri_task_multiplexer_get_completed(self->search_multiplexer) && g_strcmp0(self->search_multiplexer_query, query) == 0;
}

static gboolean
kolibri_gnome_search_provider_get_search_multiplexer(KolibriGnomeSearchProvider  *self,
                                                     const gchar                 *query,
                                                     KolibriTaskMultiplexer     **out_search_multiplexer)
{
  /* KolibriGnomeSearchProvider has only one search multiplexer at a given time,
   * and it is associated with a particular search query. If this function is
   * run with the same search query, that instance can be reused. If the query
   * has changed, the multiplexer is destroyed and a new one is created.
   */

  if (self->search_multiplexer == NULL)
    {
      self->search_multiplexer = kolibri_task_multiplexer_new();
      self->search_multiplexer_query = g_strdup(query);
    }
  else if (!kolibri_gnome_search_provider_can_attach_search(self, query))
    {
      kolibri_task_multiplexer_cancel(self->search_multiplexer);
      g_clear_pointer(&self->search_multiplexer, g_object_unref);
      g_clear_pointer(&self->search_multiplexer_query, g_free);
      self->search_multiplexer = kolibri_task_multiplexer_new();
      self->search_multiplexer_query = g_strdup(query);
    }
  else
    {
      *out_search_multiplexer = self->search_multiplexer;
      return FALSE;
    }

  *out_search_multiplexer = self->search_multiplexer;
  return TRUE;
}

static gboolean
filter_item_id_for_channel(const gchar        *item_id,
                           const gchar        *channel_id,
                           const gchar* const *exclude_channel_ids)
{
  g_autofree gchar *node_path = NULL;
  g_autofree gchar *node_kind = NULL;
  g_autofree gchar *node_id = NULL;
  g_autofree gchar *node_context = NULL;

  if (!parse_item_id(item_id, &node_path, &node_context, NULL))
    return FALSE;

  if (!parse_node_path(node_path, &node_kind, &node_id, NULL))
    return FALSE;

  gboolean is_channel_root = g_strcmp0(node_id, node_context) == 0;

  if (channel_id != NULL)
    // In a channel-specific search provider, an item_id matches if its context
    // string matches channel_id, unless it is the channel root node.
    return g_strcmp0(node_context, channel_id) == 0 && !is_channel_root;
  else if (exclude_channel_ids == NULL)
    // For the default search provider, anything matches...
    return TRUE;
  else
    // Unless its context string is listed in exclude_channel_ids.
    // Note that this can include root nodes by adding `|| is_channel_root`.
    // We choose not to because channels in exclude_channel_ids will likely
    // appear as applications in this situation, so listing them under Kolibri's
    // search provider would be redundant.
    return !g_strv_contains(exclude_channel_ids, node_context);
}

static gsize
filter_item_ids(const GStrv all_item_ids,
                const gchar        *channel_id,
                const gchar* const *exclude_channel_ids,
                GStrv              *out_item_ids)
{
  g_autoptr(GStrvBuilder) strv_builder = g_strv_builder_new();

  gsize all_item_ids_count = g_strv_length(all_item_ids);

  for (guint n = 0; n < all_item_ids_count; n++)
    {
      const gchar *item_id = all_item_ids[n];

      if (filter_item_id_for_channel(item_id, channel_id, exclude_channel_ids))
        g_strv_builder_add(strv_builder, item_id);
    }

  *out_item_ids = g_strv_builder_end(strv_builder);
  return g_strv_length(*out_item_ids);
}

static gsize
get_channel_ids_for_invocation_tasks(GListModel *invocation_tasks, GStrv *out_channel_ids)
{
  g_autoptr(GStrvBuilder) strv_builder = g_strv_builder_new();

  for (guint n = 0; n < g_list_model_get_n_items(invocation_tasks); n++)
    {
      g_autoptr(GTask) task = g_list_model_get_item(invocation_tasks, n);
      GDBusMethodInvocation *invocation = G_DBUS_METHOD_INVOCATION(g_task_get_source_object(task));
      const gchar *channel_id = get_channel_id_for_invocation(invocation);
      if (channel_id != NULL)
        g_strv_builder_add(strv_builder, channel_id);
    }

  *out_channel_ids = g_strv_builder_end(strv_builder);
  return g_strv_length(*out_channel_ids);
}

static gboolean
process_search_invocation_task_result(KolibriTaskMultiplexer  *search_multiplexer,
                                      GDBusMethodInvocation   *invocation,
                                      GTask                   *task,
                                      GStrv                   *out_item_ids,
                                      GError                 **error)
{
  g_autoptr(GVariant) result_variant = NULL;
  g_autofree gchar *channel_id = NULL;

  g_auto(GStrv) exclude_channel_ids = NULL;
  g_auto(GStrv) all_item_ids = NULL;

  result_variant = g_task_propagate_pointer(task, error);

  if (result_variant == NULL)
    return FALSE;

  g_variant_get(result_variant, "(^as)", &all_item_ids);

  channel_id = get_channel_id_for_invocation(invocation);

  if (channel_id == NULL)
    {
      GListModel *all_tasks = kolibri_task_multiplexer_get_next_tasks(search_multiplexer);
      get_channel_ids_for_invocation_tasks(all_tasks, &exclude_channel_ids);
    }

  filter_item_ids(all_item_ids,
                  channel_id,
                  (const gchar* const*)exclude_channel_ids,
                  out_item_ids);

  return TRUE;
}

static void
search_multiplexer_to_get_item_ids_invocation_async_ready_cb(GObject      *source_object,
                                                             GAsyncResult *res,
                                                             gpointer user_data)
{
  GDBusMethodInvocation *invocation = G_DBUS_METHOD_INVOCATION(source_object);
  GTask *task = G_TASK(res);
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  g_autoptr(GError) error = NULL;
  g_auto(GStrv) filtered_item_ids = NULL;

  if (!process_search_invocation_task_result(self->search_multiplexer, invocation, task, &filtered_item_ids, &error))
    {
      g_dbus_method_invocation_return_gerror(invocation, error);
      return;
    }

  shell_search_provider2_complete_get_initial_result_set(self->search_provider_skeleton,
                                                         invocation,
                                                         (const gchar *const *)filtered_item_ids);
}

static void
search_multiplexer_to_get_subsearch_result_set_invocation_async_ready_cb(GObject      *source_object,
                                                                         GAsyncResult *res,
                                                                         gpointer user_data)
{
  GDBusMethodInvocation *invocation = G_DBUS_METHOD_INVOCATION(source_object);
  GTask *task = G_TASK(res);
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  g_autoptr(GError) error = NULL;
  g_auto(GStrv) filtered_item_ids = NULL;

  if (!process_search_invocation_task_result(self->search_multiplexer, invocation, task, &filtered_item_ids, &error))
    {
      g_dbus_method_invocation_return_gerror(invocation, error);
      return;
    }

  shell_search_provider2_complete_get_subsearch_result_set(self->search_provider_skeleton,
                                                           invocation,
                                                           (const gchar *const *)filtered_item_ids);
}

static gboolean
create_search_task(KolibriGnomeSearchProvider *self,
                   GDBusMethodInvocation  *invocation,
                   gchar **terms,
                   GAsyncReadyCallback ready_cb)
{
  KolibriTaskMultiplexer* search_multiplexer = NULL;

  g_autoptr(GTask) task = NULL;
  g_autofree gchar *query = g_strjoinv(" ", terms);

  gboolean search_multiplexer_is_new = kolibri_gnome_search_provider_get_search_multiplexer(self,
                                                                                            query,
                                                                                            &search_multiplexer);

  task = kolibri_task_multiplexer_add_next(search_multiplexer,
                                           G_OBJECT(invocation),
                                           ready_cb,
                                           self);

  if (search_multiplexer_is_new)
    kolibri_daemon_main_call_get_item_ids_for_search(self->kolibri_daemon,
                                                     query,
                                                     kolibri_task_multiplexer_get_cancellable(search_multiplexer),
                                                     multiplex_dbus_proxy_call_async_ready_cb,
                                                     search_multiplexer);

  return TRUE;
}

static gboolean
handle_get_initial_result_set(ShellSearchProvider2   *skeleton,
                              GDBusMethodInvocation  *invocation,
                              gchar                 **terms,
                              gpointer user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  create_search_task(self,
                     invocation,
                     terms,
                     search_multiplexer_to_get_item_ids_invocation_async_ready_cb);

  g_signal_emit(self, search_provider_signals[SEARCH_PROVIDER_METHOD_CALLED], 0);

  return TRUE;
}

static gboolean
handle_get_subsearch_result_set(ShellSearchProvider2   *skeleton,
                                GDBusMethodInvocation  *invocation,
                                gchar                 **previous_results,
                                gchar                 **terms,
                                gpointer user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  create_search_task(self,
                     invocation,
                     terms,
                     search_multiplexer_to_get_subsearch_result_set_invocation_async_ready_cb);

  return TRUE;
}

static gboolean
handle_get_result_metas(ShellSearchProvider2   *skeleton,
                        GDBusMethodInvocation  *invocation,
                        gchar                 **results,
                        gpointer user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  kolibri_daemon_main_call_get_metadata_for_item_ids(self->kolibri_daemon,
                                                     (const gchar *const *)results,
                                                     NULL,
                                                     kolibri_daemon_get_metadata_for_item_ids_async_ready_cb,
                                                     invocation);

  g_signal_emit(self, search_provider_signals[SEARCH_PROVIDER_METHOD_CALLED], 0);

  return TRUE;
}

static gboolean
handle_launch_search(ShellSearchProvider2   *skeleton,
                     GDBusMethodInvocation  *invocation,
                     gchar                 **terms,
                     guint32 timestamp,
                     gpointer user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  g_autoptr(GError) error = NULL;
  g_autofree gchar *query = g_strjoinv(" ", terms);
  g_autofree gchar *channel_id = get_channel_id_for_invocation(invocation);

  if (!activate_kolibri(channel_id, NULL, query, &error))
    {
      g_dbus_method_invocation_return_gerror(invocation, error);
    }
  else
    {
      g_dbus_method_invocation_return_value(invocation, NULL);
    }

  g_signal_emit(self, search_provider_signals[SEARCH_PROVIDER_METHOD_CALLED], 0);

  return TRUE;
}

static gboolean
handle_activate_result(ShellSearchProvider2   *skeleton,
                       GDBusMethodInvocation  *invocation,
                       gchar                  *result,
                       gchar                 **terms,
                       guint32 timestamp,
                       gpointer user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  g_autoptr(GError) error = NULL;
  g_autofree gchar *query = g_strjoinv(" ", terms);
  g_autofree gchar *channel_id = get_channel_id_for_invocation(invocation);

  if (!activate_kolibri(channel_id, result, query, &error))
    {
      g_dbus_method_invocation_return_gerror(invocation, error);
    }
  else
    {
      g_dbus_method_invocation_return_value(invocation, NULL);
    }

  g_signal_emit(self, search_provider_signals[SEARCH_PROVIDER_METHOD_CALLED], 0);

  return TRUE;
}

static KolibriDaemonMain *
get_default_kolibri_daemon_main_proxy_sync(GDBusProxyFlags   flags,
                                           GCancellable     *cancellable,
                                           GError          **error)
{
  return kolibri_daemon_main_proxy_new_for_bus_sync(kolibri_daemon_get_default_bus_type(),
                                                    G_DBUS_PROXY_FLAGS_NONE,
                                                    DAEMON_APPLICATION_ID,
                                                    DAEMON_MAIN_OBJECT_PATH,
                                                    cancellable,
                                                    error);
}

KolibriGnomeSearchProvider *
kolibri_gnome_search_provider_new(void)
{
  KolibriGnomeSearchProvider *self = g_object_new(KOLIBRI_GNOME_TYPE_SEARCH_PROVIDER, NULL);

  g_autoptr(GError) error = NULL;

  self->kolibri_daemon = get_default_kolibri_daemon_main_proxy_sync(G_DBUS_PROXY_FLAGS_NONE,
                                                                    NULL,
                                                                    &error);

  if (self->kolibri_daemon == NULL)
    g_log(G_LOG_DOMAIN, G_LOG_LEVEL_ERROR, "Error creating Kolibri daemon proxy: %s\n", error->message);

  self->search_provider_skeleton = shell_search_provider2_skeleton_new();

  g_signal_connect_object(self->search_provider_skeleton,
                          "handle-get-initial-result-set",
                          G_CALLBACK(handle_get_initial_result_set),
                          self,
                          0);

  g_signal_connect_object(self->search_provider_skeleton,
                          "handle-get-result-metas",
                          G_CALLBACK(handle_get_result_metas),
                          self,
                          0);

  g_signal_connect_object(self->search_provider_skeleton,
                          "handle-get-subsearch-result-set",
                          G_CALLBACK(handle_get_subsearch_result_set),
                          self,
                          0);

  g_signal_connect_object(self->search_provider_skeleton,
                          "handle-launch-search",
                          G_CALLBACK(handle_launch_search),
                          self,
                          0);

  g_signal_connect_object(self->search_provider_skeleton,
                          "handle-activate-result",
                          G_CALLBACK(handle_activate_result),
                          self,
                          0);

  return self;
}

static gchar **
subtree_enumerate(GDBusConnection *connection,
                  const gchar     *sender,
                  const gchar     *object_path,
                  gpointer user_data)
{
  return NULL;
}

static GDBusInterfaceInfo **
subtree_introspect(GDBusConnection *connection,
                   const gchar     *sender,
                   const gchar     *object_path,
                   const gchar     *node,
                   gpointer user_data)
{
  GPtrArray *interface_info_array;

  interface_info_array = g_ptr_array_new();

  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  if (node != NULL && g_str_has_prefix(node, SEARCH_PROVIDER_CHANNEL_NODE_PREFIX))
    {
      GDBusInterfaceInfo *interface_info = g_dbus_interface_skeleton_get_info(G_DBUS_INTERFACE_SKELETON(self->search_provider_skeleton));
      g_ptr_array_add(interface_info_array, (gpointer)interface_info);
    }
  g_ptr_array_add(interface_info_array, NULL);

  return (GDBusInterfaceInfo **)g_ptr_array_free(interface_info_array, FALSE);
}

static const GDBusInterfaceVTable *
subtree_dispatch(GDBusConnection *connection,
                 const gchar     *sender,
                 const gchar     *object_path,
                 const gchar     *interface_name,
                 const gchar     *node,
                 gpointer        *out_user_data,
                 gpointer user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  GDBusInterfaceInfo *search_provider_interface_info = g_dbus_interface_skeleton_get_info(G_DBUS_INTERFACE_SKELETON(self->search_provider_skeleton));

  if (node != NULL && g_str_has_prefix(node, SEARCH_PROVIDER_CHANNEL_NODE_PREFIX))
    {
      if (g_strcmp0(interface_name, search_provider_interface_info->name) == 0)
        {
          *out_user_data = self->search_provider_skeleton;
          return g_dbus_interface_skeleton_get_vtable(G_DBUS_INTERFACE_SKELETON(self->search_provider_skeleton));
        }
    }

  *out_user_data = NULL;
  return NULL;
}

static const GDBusSubtreeVTable subtree_vtable =
{
  subtree_enumerate,
  subtree_introspect,
  subtree_dispatch
};

gboolean
kolibri_gnome_search_provider_register_on_connection(KolibriGnomeSearchProvider  *self,
                                                     GDBusConnection             *connection,
                                                     const gchar                 *object_path,
                                                     GError                     **error)
{
  /* We use a subtree to provide objects for names like object_path/channel_123,
   * and separately register an object at object_path to avoid trampling on the
   * existing interfaces exported by GApplication.
   */

  g_assert(self->base_registration_id == 0);
  g_assert(self->subtree_registration_id == 0);

  GDBusInterfaceInfo *search_provider_interface_info = g_dbus_interface_skeleton_get_info(G_DBUS_INTERFACE_SKELETON(self->search_provider_skeleton));
  GDBusInterfaceVTable *search_provider_interface_vtable = g_dbus_interface_skeleton_get_vtable(G_DBUS_INTERFACE_SKELETON(self->search_provider_skeleton));

  self->base_registration_id = g_dbus_connection_register_object(connection,
                                                                 object_path,
                                                                 search_provider_interface_info,
                                                                 search_provider_interface_vtable,
                                                                 g_object_ref(self->search_provider_skeleton),
                                                                 g_object_unref,
                                                                 NULL);

  if (self->base_registration_id == 0)
    return FALSE;

  self->subtree_registration_id = g_dbus_connection_register_subtree(connection,
                                                                     object_path,
                                                                     &subtree_vtable,
                                                                     G_DBUS_SUBTREE_FLAGS_DISPATCH_TO_UNENUMERATED_NODES,
                                                                     g_object_ref(self),
                                                                     g_object_unref,
                                                                     error);

  if (self->subtree_registration_id == 0)
    return FALSE;

  return TRUE;
}

gboolean
kolibri_gnome_search_provider_unregister_on_connection(KolibriGnomeSearchProvider *self,
                                                       GDBusConnection            *connection)
{
  g_assert(self->base_registration_id != 0);
  g_assert(self->subtree_registration_id != 0);

  if (!g_dbus_connection_unregister_object(connection, self->base_registration_id))
    return FALSE;
  self->base_registration_id = 0;

  if (!g_dbus_connection_unregister_subtree(connection, self->subtree_registration_id))
    return FALSE;
  self->subtree_registration_id = 0;

  return TRUE;
}
