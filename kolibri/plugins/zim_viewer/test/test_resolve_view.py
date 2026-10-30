import hashlib
import os
import struct
import tempfile

from django.test import override_settings
from django.test import TestCase
from django.urls import reverse

from kolibri.core.content.utils.paths import get_content_storage_file_path
from kolibri.plugins.zim_viewer.test.fixtures import BLOB_BODY
from kolibri.plugins.zim_viewer.test.fixtures import build_minimal_zim
from kolibri.plugins.zim_viewer.test.fixtures import build_zim
from kolibri.plugins.zim_viewer.test.fixtures import build_zim_with_redirect
from kolibri.plugins.zim_viewer.test.fixtures import ZSTD_CLUSTER
from kolibri.utils.tests.helpers import override_option

# https://wiki.openzim.org/wiki/ZIM_file_format#Header
URL_PTR_POS_FIELD = 32
CLUSTER_PTR_POS_FIELD = 48


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ZimResolveBatchViewTests(TestCase):
    def setUp(self):
        self.filename = f"{hashlib.md5(b'DUMMYDATA').hexdigest()}.zim"
        self.zim_path = get_content_storage_file_path(self.filename)
        zim_dir = os.path.dirname(self.zim_path)
        if not os.path.exists(zim_dir):
            os.makedirs(zim_dir)
        self._write_zim(build_minimal_zim())

    def _write_zim(self, data):
        with open(self.zim_path, "wb") as fh:
            fh.write(data)

    def _url(self, filename, paths):
        base = reverse(
            "kolibri:kolibri.plugins.zim_viewer:zim_resolve_batch",
            kwargs={"filename": filename},
        )
        if not paths:
            return base
        return base + "?" + "&".join(f"path={p}" for p in paths)

    def test_resolves_an_article_descriptor(self):
        response = self.client.get(self._url(self.filename, ["C/Index"]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "results": {
                    "C/Index": {
                        "clusterNumber": 0,
                        "blobNumber": 0,
                        "blobOffset": build_minimal_zim().index(BLOB_BODY),
                        "blobSize": len(BLOB_BODY),
                        "mimetype": "text/html",
                        "namespace": "C",
                        "path": "C/Index",
                    },
                },
            },
        )

    def test_blob_range_covers_each_blob_of_an_uncompressed_cluster(self):
        bodies = {b"a": b"first body", b"b": b"", b"c": b"third"}
        data = build_zim(
            [(b"C", url, "text/html", body) for url, body in bodies.items()]
        )
        self._write_zim(data)
        response = self.client.get(self._url(self.filename, ["C/a", "C/b", "C/c"]))
        results = response.json()["results"]
        for url, body in bodies.items():
            descriptor = results[f"C/{url.decode()}"]
            start = descriptor["blobOffset"]
            self.assertEqual(data[start : start + descriptor["blobSize"]], body)

    def test_blob_range_reads_extended_offsets(self):
        data = build_zim([(b"C", b"Index", "text/html", BLOB_BODY)], extended=True)
        self._write_zim(data)
        response = self.client.get(self._url(self.filename, ["C/Index"]))
        descriptor = response.json()["results"]["C/Index"]
        self.assertEqual(descriptor["blobOffset"], data.index(BLOB_BODY))
        self.assertEqual(descriptor["blobSize"], len(BLOB_BODY))

    def test_compressed_cluster_has_no_blob_range(self):
        self._write_zim(
            build_zim(
                [(b"C", b"Index", "text/html", BLOB_BODY)], compression=ZSTD_CLUSTER
            )
        )
        response = self.client.get(self._url(self.filename, ["C/Index"]))
        descriptor = response.json()["results"]["C/Index"]
        self.assertNotIn("blobOffset", descriptor)
        self.assertNotIn("blobSize", descriptor)

    def _assert_400_with_index_dirent_patched(self, fmt, offset_from_url, value):
        data = bytearray(build_minimal_zim())
        struct.pack_into(fmt, data, data.index(b"Index\x00") - offset_from_url, value)
        self._write_zim(bytes(data))
        response = self.client.get(self._url(self.filename, ["C/Index"]))
        self.assertEqual(response.status_code, 400)

    def test_returns_400_for_a_blob_past_the_offset_table(self):
        self._assert_400_with_index_dirent_patched("<I", 4, 1)

    def _assert_400_with_first_pointer_patched(self, header_field_offset, value):
        data = bytearray(build_minimal_zim())
        (pointer_list_pos,) = struct.unpack_from("<Q", data, header_field_offset)
        struct.pack_into("<Q", data, pointer_list_pos, value)
        self._write_zim(bytes(data))
        response = self.client.get(self._url(self.filename, ["C/Index"]))
        self.assertEqual(response.status_code, 400)

    def test_returns_400_for_an_entry_pointer_past_the_file(self):
        self._assert_400_with_first_pointer_patched(URL_PTR_POS_FIELD, 2**64 - 1)

    def test_returns_400_for_a_cluster_pointer_past_the_file(self):
        self._assert_400_with_first_pointer_patched(CLUSTER_PTR_POS_FIELD, 2**63)

    def test_returns_400_for_a_cluster_number_past_the_cluster_count(self):
        self._assert_400_with_index_dirent_patched("<I", 8, 3)

    def test_returns_400_for_a_mime_index_past_the_mime_list(self):
        self._assert_400_with_index_dirent_patched("<H", 16, 1)

    def test_returns_400_for_a_blob_that_ends_past_the_file(self):
        data = bytearray(build_minimal_zim())
        struct.pack_into("<I", data, data.index(BLOB_BODY) - 4, 10**6)
        self._write_zim(bytes(data))
        response = self.client.get(self._url(self.filename, ["C/Index"]))
        self.assertEqual(response.status_code, 400)

    def test_missing_paths_are_simply_absent(self):
        response = self.client.get(self._url(self.filename, ["C/Index", "C/Missing"]))
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertIn("C/Index", results)
        self.assertNotIn("C/Missing", results)

    def test_follows_redirects(self):
        data = build_zim_with_redirect()
        self._write_zim(data)
        response = self.client.get(self._url(self.filename, ["C/Redirect"]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["results"]["C/Redirect"],
            {
                "clusterNumber": 0,
                "blobNumber": 0,
                "blobOffset": data.index(BLOB_BODY),
                "blobSize": len(BLOB_BODY),
                "mimetype": "text/html",
                "namespace": "C",
                "path": "C/Index",
            },
        )

    def test_empty_path_list_returns_empty_results(self):
        response = self.client.get(self._url(self.filename, []))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"results": {}})

    def test_sets_immutable_cache_header_on_success(self):
        response = self.client.get(self._url(self.filename, ["C/Index"]))
        self.assertEqual(
            response["Cache-Control"], "public, max-age=31536000, immutable"
        )

    @override_settings(
        CACHES={
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": "zim-resolve-batch-test",
            }
        }
    )
    def test_answers_from_the_file_not_a_server_side_cache(self):
        url = self._url(self.filename, ["C/Index"])
        self.client.get(url)
        os.remove(self.zim_path)
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_returns_404_for_unknown_file(self):
        unknown = f"{'0' * 32}.zim"
        response = self.client.get(self._url(unknown, ["C/Index"]))
        self.assertEqual(response.status_code, 404)
        self.assertNotIn("Cache-Control", response)

    def test_returns_400_for_truncated_zim(self):
        self._write_zim(build_minimal_zim()[:85])
        response = self.client.get(self._url(self.filename, ["C/Index"]))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "Corrupt ZIM file"})

    def test_returns_400_for_a_file_that_is_not_a_zim(self):
        self._write_zim(b"\x00" * 100)
        response = self.client.get(self._url(self.filename, ["C/Index"]))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "Not a ZIM file"})

    def _get_storage_file(self, filename):
        with open(os.path.join(os.path.dirname(self.zim_path), filename), "wb") as fh:
            fh.write(build_minimal_zim())
        url = self._url(self.filename, ["C/Index"]).replace(self.filename, filename)
        return self.client.get(url)

    def test_returns_404_for_a_storage_file_that_is_not_a_zim(self):
        filename = self.filename.replace(".zim", ".mp4")
        self.assertEqual(self._get_storage_file(filename).status_code, 404)

    def test_returns_404_for_a_filename_with_trailing_characters(self):
        filename = f"{self.filename}.bak"
        self.assertEqual(self._get_storage_file(filename).status_code, 404)
