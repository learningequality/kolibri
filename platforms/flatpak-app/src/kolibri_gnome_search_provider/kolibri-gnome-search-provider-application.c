/* kolibri-gnome-search-provider-application.c
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

#include "kolibri-gnome-search-provider-application.h"

#include "config.h"
#include "kolibri-gnome-search-provider.h"

#define DEFAULT_INACTIVITY_TIMEOUT 20000

struct _KolibriGnomeSearchProviderApplication {
  GApplication parent;

  KolibriGnomeSearchProvider *search_provider;
};

G_DEFINE_TYPE(KolibriGnomeSearchProviderApplication, kolibri_gnome_search_provider_application, G_TYPE_APPLICATION)

static void
kolibri_gnome_search_provider_application_dispose(GObject *gobject)
{
  KolibriGnomeSearchProviderApplication *self = KOLIBRI_GNOME_SEARCH_PROVIDER_APPLICATION(gobject);

  g_clear_pointer(&self->search_provider, g_object_unref);

  G_OBJECT_CLASS(kolibri_gnome_search_provider_application_parent_class)->dispose(gobject);
}

static void
kolibri_gnome_search_provider_application_finalize(GObject *gobject)
{
  G_OBJECT_CLASS(kolibri_gnome_search_provider_application_parent_class)->finalize(gobject);
}

static void
kolibri_gnome_search_provider_application_activate(GApplication *application)
{
  G_APPLICATION_CLASS(kolibri_gnome_search_provider_application_parent_class)->activate(application);
}

static gboolean
kolibri_gnome_search_provider_application_dbus_register(GApplication     *application,
                                                        GDBusConnection  *connection,
                                                        const gchar      *object_path,
                                                        GError          **error)
{
  KolibriGnomeSearchProviderApplication *self = KOLIBRI_GNOME_SEARCH_PROVIDER_APPLICATION(application);

  if (!G_APPLICATION_CLASS(kolibri_gnome_search_provider_application_parent_class)->dbus_register(application, connection, object_path, error))
    return FALSE;

  if (!kolibri_gnome_search_provider_register_on_connection(self->search_provider, connection, object_path, error))
    return FALSE;

  return TRUE;
}

static void
kolibri_gnome_search_provider_application_dbus_unregister(GApplication    *application,
                                                          GDBusConnection *connection,
                                                          const gchar     *object_path)
{
  KolibriGnomeSearchProviderApplication *self = KOLIBRI_GNOME_SEARCH_PROVIDER_APPLICATION(application);

  kolibri_gnome_search_provider_unregister_on_connection(self->search_provider, connection);

  G_APPLICATION_CLASS(kolibri_gnome_search_provider_application_parent_class)->dbus_unregister(application, connection, object_path);
}

static void
kolibri_gnome_search_provider_application_class_init(KolibriGnomeSearchProviderApplicationClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS(klass);
  GApplicationClass *application_class = G_APPLICATION_CLASS(klass);

  object_class->dispose = kolibri_gnome_search_provider_application_dispose;
  object_class->finalize = kolibri_gnome_search_provider_application_finalize;

  application_class->activate = kolibri_gnome_search_provider_application_activate;
  application_class->dbus_register = kolibri_gnome_search_provider_application_dbus_register;
  application_class->dbus_unregister = kolibri_gnome_search_provider_application_dbus_unregister;
}

static void
kolibri_gnome_search_provider_application_init(KolibriGnomeSearchProviderApplication *self)
{
  self->search_provider = NULL;
}

static void
kolibri_gnome_search_provider_on_method_called(KolibriGnomeSearchProvider *search_provider,
                                               gpointer user_data)
{
  KolibriGnomeSearchProviderApplication *self = KOLIBRI_GNOME_SEARCH_PROVIDER_APPLICATION(user_data);

  kolibri_gnome_search_provider_application_reset_inactivity_timeout(self);
}

KolibriGnomeSearchProviderApplication *
kolibri_gnome_search_provider_application_new(const gchar       *application_id,
                                              GApplicationFlags flags)
{
  KolibriGnomeSearchProviderApplication *self = g_object_new(KOLIBRI_GNOME_TYPE_SEARCH_PROVIDER_APPLICATION,
                                                             "application-id", application_id,
                                                             "flags", flags,
                                                             "inactivity-timeout", DEFAULT_INACTIVITY_TIMEOUT,
                                                             NULL);

  self->search_provider = kolibri_gnome_search_provider_new();
  g_signal_connect(self->search_provider, "method-called", G_CALLBACK(kolibri_gnome_search_provider_on_method_called), self);

  return self;
}

void
kolibri_gnome_search_provider_application_reset_inactivity_timeout(KolibriGnomeSearchProviderApplication *self)
{
  g_application_hold(G_APPLICATION(self));
  g_application_release(G_APPLICATION(self));
}
