/* kolibri-task-multiplexer.c
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

#include "kolibri-task-multiplexer.h"

struct _KolibriTaskMultiplexer {
  GObject parent;

  GTask *main_task;
  GListStore *next_tasks;

  gboolean is_started;
};

G_DEFINE_TYPE(KolibriTaskMultiplexer, kolibri_task_multiplexer, G_TYPE_OBJECT)

#define g_variant_unref_destroy_notify (void (*)(void *))g_variant_unref

static void
kolibri_task_multiplexer_dispose(GObject *gobject)
{
  KolibriTaskMultiplexer *self = KOLIBRI_TASK_MULTIPLEXER(gobject);

  if (self->next_tasks != NULL)
    g_list_store_remove_all(self->next_tasks);

  g_clear_pointer(&self->main_task, g_object_unref);
  g_clear_pointer(&self->next_tasks, g_object_unref);

  G_OBJECT_CLASS(kolibri_task_multiplexer_parent_class)->dispose(gobject);
}

static void
kolibri_task_multiplexer_finalize(GObject *gobject)
{
  G_OBJECT_CLASS(kolibri_task_multiplexer_parent_class)->finalize(gobject);
}

static void
kolibri_task_multiplexer_class_init(KolibriTaskMultiplexerClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS(klass);

  object_class->dispose = kolibri_task_multiplexer_dispose;
  object_class->finalize = kolibri_task_multiplexer_finalize;
}

static void
kolibri_task_multiplexer_init(KolibriTaskMultiplexer *self)
{
  self->main_task = NULL;
  self->next_tasks = NULL;
  self->is_started = FALSE;
}

static void
kolibri_task_multiplexer_return_error_to_next(KolibriTaskMultiplexer *self,
                                              GError                 *error)
{
  guint next_tasks_count = g_list_model_get_n_items(G_LIST_MODEL(self->next_tasks));

  g_debug("Return error to %d tasks: %s",
          next_tasks_count,
          error->message);

  for (guint n = 0; n < next_tasks_count; n++)
    {
      g_autoptr(GTask) next_task = g_list_model_get_item(G_LIST_MODEL(self->next_tasks), n);
      g_task_return_error(next_task, g_error_copy(error));
    }

  g_list_store_remove_all(self->next_tasks);
}

static void
kolibri_task_multiplexer_return_variant_to_next(KolibriTaskMultiplexer *self,
                                                GVariant               *result_variant)
{
  guint next_tasks_count = g_list_model_get_n_items(G_LIST_MODEL(self->next_tasks));

  g_debug("Return variant to %d tasks",
          next_tasks_count);

  for (guint n = 0; n < next_tasks_count; n++)
    {
      g_autoptr(GTask) next_task = g_list_model_get_item(G_LIST_MODEL(self->next_tasks), n);
      g_task_return_pointer(next_task,
                            g_variant_ref(result_variant),
                            g_variant_unref_destroy_notify);
    }

  g_list_store_remove_all(self->next_tasks);
}

static void
kolibri_task_multiplexer_main_task_async_ready_cb(GObject      *source_object,
                                                  GAsyncResult *res,
                                                  gpointer user_data)
{
  KolibriTaskMultiplexer *self = KOLIBRI_TASK_MULTIPLEXER(source_object);
  GTask *task = G_TASK(res);

  g_autoptr(GError) error = NULL;
  g_autoptr(GVariant) result_variant = NULL;

  result_variant = g_task_propagate_pointer(task, &error);

  if (result_variant == NULL)
    kolibri_task_multiplexer_return_error_to_next(self, error);
  else
    kolibri_task_multiplexer_return_variant_to_next(self, result_variant);

  g_clear_pointer(&self->main_task, g_object_unref);
}

/**
 * kolibri_task_multiplexer_new:
 *
 * Create a new #KolibriTaskMultiplexer.
 *
 * Returns: (not nullable) (transfer full): A new #KolibriTaskMultiplexer.
 */
KolibriTaskMultiplexer *
kolibri_task_multiplexer_new(void)
{
  KolibriTaskMultiplexer *self = g_object_new(KOLIBRI_TYPE_TASK_MULTIPLEXER, NULL);

  GCancellable *cancellable = g_cancellable_new();
  self->main_task = g_task_new(self, cancellable, kolibri_task_multiplexer_main_task_async_ready_cb, NULL);
  self->next_tasks = g_list_store_new(g_task_get_type());

  return self;
}

/**
 * kolibri_task_multiplexer_push_error:
 * @self: (not nullable): A #KolibriTaskMultiplexer.
 * @error: (not nullable): A #GError.
 *
 * Complete the main task with a #GError which will be returned to all tasks
 * attached to the multiplexer.
 */
void kolibri_task_multiplexer_push_error(KolibriTaskMultiplexer *self,
                                         GError                 *error)
{
  g_assert_nonnull(self->main_task);
  g_task_return_error(self->main_task, g_error_copy(error));
}

/**
 * kolibri_task_multiplexer_push_variant:
 * @self: (not nullable): A #KolibriTaskMultiplexer.
 * @result_variant: (not nullable): A #GVariant.
 *
 * Complete the main task with a #GVariant which will be returned to all tasks
 * attached to the multiplexer.
 */
void kolibri_task_multiplexer_push_variant(KolibriTaskMultiplexer *self,
                                           GVariant               *result_variant)
{
  g_assert_nonnull(self->main_task);
  g_task_return_pointer(self->main_task,
                        g_variant_ref(result_variant),
                        g_variant_unref_destroy_notify);
}

/**
 * kolibri_task_multiplexer_get_cancellable:
 * @self: (not nullable): A #KolibriTaskMultiplexer.
 *
 * Get the multiplexer's #GCancellable. This is useful when creating an
 * asynchronous task that returns information through the multiplexer.
 *
 * Returns: (nullable) (transfer none): A #GCancellable.
 */
GCancellable *
kolibri_task_multiplexer_get_cancellable(KolibriTaskMultiplexer *self)
{
  if (self->main_task == NULL)
    return NULL;

  return g_task_get_cancellable(self->main_task);
}

/**
 * kolibri_task_multiplexer_cancel:
 * @self: (not nullable): A #KolibriTaskMultiplexer.
 *
 * Helper function that cancels the multiplexer's #GCancellable.
 */
void
kolibri_task_multiplexer_cancel(KolibriTaskMultiplexer *self)
{
  GCancellable *cancellable = kolibri_task_multiplexer_get_cancellable(self);
  if (cancellable != NULL)
    g_cancellable_cancel(cancellable);
}

/**
 * kolibri_task_multiplexer_get_completed:
 * @self: (not nullable): A #KolibriTaskMultiplexer.
 *
 * Returns #TRUE if the multiplexer's main task has completed. It is useful to
 * to check this before calling #kolibri_task_multiplexer_add_next.
 *
 * Returns: #TRUE if the multiplexer has completed.
 */
gboolean
kolibri_task_multiplexer_get_completed(KolibriTaskMultiplexer *self)
{
  return self->main_task == NULL || g_task_get_completed(self->main_task);
}

/**
 * kolibri_task_multiplexer_add_next:
 * @self: (not nullable): A #KolibriTaskMultiplexer.
 * @source_object: (nullable): The #GObject that owns this task.
 * @callback: (not nullable): A #GAsyncReadyCallback.
 * @callback_data: (nullable): User data passed to #callback.
 *
 * Adds a task which will be run after the multiplexer's main task is completed.
 *
 * Returns: (not nullable): A new #GTask.
 */
GTask *
kolibri_task_multiplexer_add_next(KolibriTaskMultiplexer *self,
                                  GObject                *source_object,
                                  GAsyncReadyCallback callback,
                                  gpointer callback_data)
{
  g_autoptr(GTask) next_task = NULL;

  next_task = g_task_new(source_object,
                         kolibri_task_multiplexer_get_cancellable(self),
                         callback,
                         callback_data);

  g_list_store_append(self->next_tasks, next_task);

  return g_steal_pointer(&next_task);
}

/**
 * kolibri_task_multiplexer_get_next_tasks:
 * @self: (not nullable): A #KolibriTaskMultiplexer
 *
 * Get the list of tasks created by #kolibri_task_multiplexer_add_next.
 *
 * Returns: (not nullable) (transfer none): A #GListModel containing #GTask objects.
 *
 */
GListModel *
kolibri_task_multiplexer_get_next_tasks(KolibriTaskMultiplexer *self)
{
  return G_LIST_MODEL(self->next_tasks);
}
