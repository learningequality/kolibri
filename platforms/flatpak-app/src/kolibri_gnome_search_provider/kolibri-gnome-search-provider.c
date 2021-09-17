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

#include "config.h"
#include "kolibri-daemon-dbus.h"
#include "kolibri-gnome-search-provider.h"
#include "kolibri-utils.h"
#include "shell-search-provider-dbus.h"

#include <gio/gdesktopappinfo.h>

struct _KolibriGnomeSearchProvider {
  GObject parent;

  ShellSearchProvider2 *search_provider_skeleton;
  KolibriDaemon *kolibri_daemon;
  guint base_registration_id;
  guint subtree_registration_id;
};

G_DEFINE_TYPE(KolibriGnomeSearchProvider, kolibri_gnome_search_provider, G_TYPE_OBJECT)

enum {
  SEARCH_PROVIDER_METHOD_CALLED,
  _SEARCH_PROVIDER_LAST_SIGNAL
};

static guint search_provider_signals[_SEARCH_PROVIDER_LAST_SIGNAL];

typedef enum {
  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR_INVALID_ITEM_ID,
  KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR_WRONG_CHANNEL,
} KolibriGnomeSearchProviderError;

G_DEFINE_QUARK(kolibri - gnome - search - provider - error - quark, kolibri_gnome_search_provider_error)
#define KOLIBRI_GNOME_SEARCH_PROVIDER_ERROR (kolibri_gnome_search_provider_error_quark())

#define SEARCH_PROVIDER_CHANNEL_NODE_PREFIX "channel_"
#define SEARCH_PROVIDER_CHANNEL_OBJECT_PATH_PREFIX SEARCH_PROVIDER_OBJECT_PATH "/" SEARCH_PROVIDER_CHANNEL_NODE_PREFIX

static void
kolibri_gnome_search_provider_dispose(GObject *gobject)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(gobject);

  g_clear_pointer(&self->search_provider_skeleton, g_object_unref);
  g_clear_pointer(&self->kolibri_daemon, g_object_unref);

  G_OBJECT_CLASS(kolibri_gnome_search_provider_parent_class)->dispose(gobject);
}

static void
kolibri_gnome_search_provider_finalize(GObject *gobject)
{
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

static void
kolibri_daemon_get_item_ids_for_search_async_ready_cb(GObject      *source_object,
                                                      GAsyncResult *res,
                                                      gpointer      user_data)
{
  KolibriDaemon *kolibri_daemon = KOLIBRI_DAEMON(source_object);
  GDBusMethodInvocation *invocation = G_DBUS_METHOD_INVOCATION(user_data);

  g_autofree gchar *channel_id = get_channel_id_for_invocation(invocation);

  g_autoptr(GError) error = NULL;
  g_auto(GVariantBuilder) builder;
  g_auto(GStrv) item_ids = NULL;

  g_variant_builder_init(&builder, G_VARIANT_TYPE("as"));

  kolibri_daemon_call_get_item_ids_for_search_finish(kolibri_daemon,
                                                     &item_ids,
                                                     res,
                                                     &error);

  if (error)
    {
      g_dbus_method_invocation_return_gerror(invocation, error);
      return;
    }

  for (guint n = 0; n < g_strv_length(item_ids); n++)
    {
      const gchar *item_id = item_ids[n];
      g_autofree gchar *node_path = NULL;
      g_autofree gchar *node_context = NULL;

      parse_item_id(item_id, &node_path, &node_context, NULL);

      if (channel_id == NULL || g_strcmp0(node_context, channel_id) == 0)
        {
          g_variant_builder_add(&builder, "s", item_id);
        }
    }

  g_dbus_method_invocation_return_value(invocation, g_variant_new("(as)", &builder));
}

static void
kolibri_daemon_get_metadata_for_item_ids_async_ready_cb(GObject      *source_object,
                                                        GAsyncResult *res,
                                                        gpointer user_data)
{
  KolibriDaemon *kolibri_daemon = KOLIBRI_DAEMON(source_object);
  GDBusMethodInvocation *invocation = G_DBUS_METHOD_INVOCATION(user_data);

  g_autoptr(GError) error = NULL;
  g_autoptr(GVariant) metas = NULL;

  kolibri_daemon_call_get_metadata_for_item_ids_finish(kolibri_daemon,
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
                           const gchar  *search,
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

  if (search != NULL)
    uri_query = g_strdup_printf("searchTerm=%s", search);

  if (node_path != NULL)
    uri_path = g_strconcat("/", node_path, NULL);

  kolibri_uri = g_uri_build(G_URI_FLAGS_NONE,
                            "x-kolibri-dispatch",
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
                 const gchar  *search,
                 GError      **error)
{
  g_autoptr(GDesktopAppInfo) app_info = NULL;
  g_autoptr(GUri) kolibri_uri = NULL;
  g_autofree gchar *kolibri_uri_string = NULL;

  // We use the x-kolibri-dispatch URI scheme with kolibri-launcher, which is
  // able to launch Kolibri with a particular channel ID. Internally, it passes
  // a kolibri URI to either the default Kolibri application instance or a
  // channel specific one.

  if (!build_kolibri_dispatch_uri(channel_id, item_id, search, &kolibri_uri, error))
    return FALSE;

  kolibri_uri_string = g_uri_to_string(kolibri_uri);

  app_info = g_desktop_app_info_new(LAUNCHER_APPLICATION_ID ".desktop");

  GList *uris_list = g_list_append(NULL, kolibri_uri_string);
  gboolean result = g_app_info_launch_uris(G_APP_INFO(app_info), uris_list, NULL, error);

  g_list_free(g_steal_pointer(&uris_list));

  return result;
}

static gboolean
handle_get_initial_result_set(ShellSearchProvider2   *skeleton,
                              GDBusMethodInvocation  *invocation,
                              gchar                 **terms,
                              gpointer                user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  g_autofree gchar *search = g_strjoinv(" ", terms);
  GCancellable *cancellable = g_cancellable_new();

  // TODO: This is very expensive because we call this same method for each
  //       search provider object, but the results are filtered by channel ID in
  //       kolibri_daemon_get_item_ids_for_search_async_ready_cb. Instead, we
  //       should only call kolibri_daemon_call_get_item_ids_for_search once,
  //       and after that returns we can group the results into channels for
  //       each invocation.

  kolibri_daemon_call_get_item_ids_for_search(self->kolibri_daemon,
                                              search,
                                              cancellable,
                                              kolibri_daemon_get_item_ids_for_search_async_ready_cb,
                                              invocation);

  g_signal_emit(self, search_provider_signals[SEARCH_PROVIDER_METHOD_CALLED], 0);

  return TRUE;
}

static gboolean
handle_get_subsearch_result_set(ShellSearchProvider2   *skeleton,
                                GDBusMethodInvocation  *invocation,
                                gchar                 **previous_results,
                                gchar                 **terms,
                                gpointer                user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  g_autofree gchar *search = g_strjoinv(" ", terms);
  GCancellable *cancellable = g_cancellable_new();

  kolibri_daemon_call_get_item_ids_for_search(self->kolibri_daemon,
                                              search,
                                              cancellable,
                                              kolibri_daemon_get_item_ids_for_search_async_ready_cb,
                                              invocation);

  g_signal_emit(self, search_provider_signals[SEARCH_PROVIDER_METHOD_CALLED], 0);

  return TRUE;
}

static gboolean
handle_get_result_metas(ShellSearchProvider2   *skeleton,
                        GDBusMethodInvocation  *invocation,
                        gchar                 **results,
                        gpointer                user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  GCancellable *cancellable = g_cancellable_new();

  kolibri_daemon_call_get_metadata_for_item_ids(self->kolibri_daemon,
                                                (const gchar *const *)results,
                                                cancellable,
                                                kolibri_daemon_get_metadata_for_item_ids_async_ready_cb,
                                                invocation);

  g_signal_emit(self, search_provider_signals[SEARCH_PROVIDER_METHOD_CALLED], 0);

  return TRUE;
}

static gboolean
handle_launch_search(ShellSearchProvider2   *skeleton,
                     GDBusMethodInvocation  *invocation,
                     gchar                 **terms,
                     guint32                 timestamp,
                     gpointer                user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  g_autofree gchar *search = g_strjoinv(" ", terms);
  g_autofree gchar *channel_id = get_channel_id_for_invocation(invocation);

  g_autoptr(GError) error = NULL;

  if (!activate_kolibri(channel_id, NULL, search, &error))
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
                       guint32                 timestamp,
                       gpointer                user_data)
{
  KolibriGnomeSearchProvider *self = KOLIBRI_GNOME_SEARCH_PROVIDER(user_data);

  g_autofree gchar *search = g_strjoinv(" ", terms);
  g_autofree gchar *channel_id = get_channel_id_for_invocation(invocation);

  g_autoptr(GError) error = NULL;

  if (!activate_kolibri(channel_id, result, search, &error))
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

static GBusType
get_bus_type(void)
{
  const gchar *kolibri_use_system_instance = g_getenv("KOLIBRI_USE_SYSTEM_INSTANCE");

  if (kolibri_use_system_instance == NULL || kolibri_use_system_instance[0] == '\0')
    return G_BUS_TYPE_SESSION;

  if (local_kolibri_exists())
    {
      g_log(G_LOG_DOMAIN, G_LOG_LEVEL_MESSAGE, "Local Kolibri data already exists, so ignoring KOLIBRI_USE_SYSTEM_INSTANCE");
      return G_BUS_TYPE_SESSION;
    }

  return G_BUS_TYPE_SYSTEM;
}

KolibriGnomeSearchProvider *
kolibri_gnome_search_provider_new(void)
{
  KolibriGnomeSearchProvider *self = g_object_new(KOLIBRI_GNOME_TYPE_SEARCH_PROVIDER, NULL);

  g_autoptr(GError) error = NULL;

  self->kolibri_daemon = kolibri_daemon_proxy_new_for_bus_sync(get_bus_type(),
                                                               G_DBUS_PROXY_FLAGS_NONE,
                                                               DAEMON_APPLICATION_ID,
                                                               DAEMON_OBJECT_PATH,
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
                  gpointer         user_data)
{
  return NULL;
}

static GDBusInterfaceInfo **
subtree_introspect(GDBusConnection *connection,
                   const gchar     *sender,
                   const gchar     *object_path,
                   const gchar     *node,
                   gpointer         user_data)
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
                 gpointer         user_data)
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
  // We use a subtree to provide objects for names like object_path/channel_123,
  // and also register an object at object_path through the usual mechanism to
  // avoid trampling on the existing interfaces exported by GApplication.

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
