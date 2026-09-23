/* kolibri-utils.c
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

#include "kolibri-utils.h"

#include "kolibri-task-multiplexer.h"

/**
 * multiplex_dbus_proxy_call_async_ready_cb:
 *
 * Helper GAsyncReadyCallback which passes the async result of a dbus proxy call
 * to a KolibriTaskMultiplexer so it will be propagated to different invocation
 * tasks.
 */
void
multiplex_dbus_proxy_call_async_ready_cb(GObject      *source_object,
                                         GAsyncResult *res,
                                         gpointer user_data)
{
  KolibriTaskMultiplexer *task_multiplexer = KOLIBRI_TASK_MULTIPLEXER(user_data);

  g_autoptr(GError) error = NULL;
  g_autoptr(GVariant) result_variant = NULL;

  result_variant = g_dbus_proxy_call_finish(G_DBUS_PROXY(source_object), res, &error);

  if (result_variant == NULL)
    kolibri_task_multiplexer_push_error(task_multiplexer, error);
  else
    kolibri_task_multiplexer_push_variant(task_multiplexer, result_variant);
}
