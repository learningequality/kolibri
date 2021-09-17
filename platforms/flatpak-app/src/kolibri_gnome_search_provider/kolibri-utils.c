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

#include <gio/gio.h>

/**
 * expanduser:
 * @path: a file path
 *
 * Expands paths beginning with "~", similar to Python's os.path.expanduser.
 *
 * Returns: (nullable) (transfer full): Path with "~" replaced by the user's home directory.
 */
static gchar *
expanduser(const gchar *path)
{
  g_auto(GStrv) path_split = NULL;

  if (path == NULL)
    return NULL;

  path_split = g_strsplit(path, "/", 2);

  if (g_strv_length(path_split) == 0)
    return g_strdup(path);

  if (g_strcmp0(path_split[0], "~") != 0)
    return g_strdup(path);

  if (g_strv_length(path_split) == 1)
    return g_strdup(g_get_home_dir());

  if (g_strv_length(path_split) == 2)
    return g_build_path("/", g_get_home_dir(), path_split[1], NULL);

  g_assert_not_reached();
}

/**
 * kolibri_home_dir:
 *
 * Get the path to the Kolibri home directory, which is either the value of
 * KOLIBRI_HOME or ~/.kolibri.
 *
 * Returns: (not nullable) (transfer full): The Kolibri home directory.
 */
gchar *
kolibri_home_dir(void)
{
  g_autofree gchar *kolibri_home = expanduser(g_getenv("KOLIBRI_HOME"));

  if (kolibri_home == NULL || kolibri_home[0] == '\0')
    return g_build_path("/", g_get_home_dir(), ".kolibri", NULL);

  return g_steal_pointer(&kolibri_home);
}

static gboolean
kolibri_file_exists(const gchar *kolibri_home,
                    const gchar *check_file_name)
{
  g_autofree gchar *check_file_path = g_build_path("/", kolibri_home, check_file_name, NULL);
  g_autoptr(GFile) check_file = g_file_new_for_path(check_file_path);

  return g_file_query_exists(check_file, NULL);
}

/**
 * local_kolibri_exists:
 *
 * Get whether a working Kolibri instance exists in the user's Kolibri home.
 *
 * Returns: TRUE if local Kolibri exists, FALSE if not
 */
gboolean
local_kolibri_exists(void)
{
  g_autofree gchar *kolibri_home = kolibri_home_dir();

  return kolibri_file_exists(kolibri_home, "content") && kolibri_file_exists(kolibri_home, "db.sqlite3");
}
