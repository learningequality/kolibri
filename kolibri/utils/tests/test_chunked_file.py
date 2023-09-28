import hashlib
import math
import os
import shutil
import tempfile
import unittest

from kolibri.utils.file_transfer import CHUNK_SUFFIX
from kolibri.utils.file_transfer import ChunkedFile
from kolibri.utils.file_transfer import ChunkedFileDirectoryManager
from kolibri.utils.file_transfer import ChunkedFileDoesNotExist


def _write_test_data_to_chunked_file(chunked_file):
    data = b""
    for i in range(chunked_file.chunks_count):
        with open(
            os.path.join(chunked_file.chunk_dir, ".chunk_{}".format(i)), "wb"
        ) as f:
            size = (
                chunked_file.chunk_size
                if i < chunked_file.chunks_count - 1
                else (chunked_file.file_size % chunked_file.chunk_size)
            )
            to_write = os.urandom(size)
            f.write(to_write)
            data += to_write
    return data


TEST_FILE_SIZE = (1024 * 1024) + 731


class TestChunkedFile(unittest.TestCase):
    def setUp(self):
        self.file_path = "test_file"

        self.chunk_size = ChunkedFile.chunk_size
        self.file_size = TEST_FILE_SIZE

        self.chunked_file = ChunkedFile(self.file_path)
        self.chunked_file.file_size = self.file_size

        # Create dummy chunks
        self.chunks_count = int(
            math.ceil(float(self.file_size) / float(self.chunk_size))
        )
        self.data = _write_test_data_to_chunked_file(self.chunked_file)

    def tearDown(self):
        shutil.rmtree(self.chunked_file.chunk_dir, ignore_errors=True)

    def test_read(self):
        # Read from the beginning
        data = self.chunked_file.read(512)
        self.assertEqual(data, self.data[:512])

    def test_read_from_middle(self):
        # Read from the middle
        self.chunked_file.seek(512 * 1024)
        data = self.chunked_file.read(512)
        self.assertEqual(data, self.data[512 * 1024 : (512 * 1024) + 512])

    def test_write(self):
        new_data = os.urandom(self.chunk_size)
        os.remove(
            os.path.join(
                self.chunked_file.chunk_dir, ".chunk_{}".format(self.chunks_count - 2)
            )
        )
        self.chunked_file.write_chunk(self.chunks_count - 2, new_data)

        self.chunked_file.seek((self.chunks_count - 2) * self.chunk_size)
        data = self.chunked_file.read(self.chunk_size)
        self.assertEqual(data, new_data)

    def test_write_whole_file(self):
        new_data = os.urandom(self.file_size)
        for i in range(self.chunks_count):
            os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_{}".format(i)))
        self.chunked_file.write_all(self.chunked_file.chunk_generator(new_data))

        self.chunked_file.seek(0)
        data = self.chunked_file.read()
        self.assertEqual(data, new_data)

    def test_write_chunk_fails_longer_than_file_size(self):
        new_data = os.urandom(self.chunked_file.chunk_size)
        with self.assertRaises(ValueError):
            self.chunked_file.write_chunk(self.chunks_count, new_data)

    def test_write_chunk_fails_negative_chunk(self):
        new_data = os.urandom(self.chunked_file.chunk_size)
        with self.assertRaises(ValueError):
            self.chunked_file.write_chunk(-1, new_data)

    def test_write_chunk_overwrites(self):
        new_data = os.urandom(self.chunked_file.chunk_size)
        self.chunked_file.write_chunk(0, new_data)
        self.chunked_file.seek(0)
        self.assertEqual(self.chunked_file.read(self.chunked_file.chunk_size), new_data)

    def test_write_whole_file_overwrites(self):
        new_data = os.urandom(self.file_size)
        os.remove(
            os.path.join(
                self.chunked_file.chunk_dir, ".chunk_{}".format(self.chunks_count - 2)
            )
        )
        self.chunked_file.seek(0)
        self.chunked_file.write_all(self.chunked_file.chunk_generator(new_data))

        data = self.chunked_file.read()
        self.assertEqual(
            data,
            new_data,
        )

    def test_seek_set(self):
        # SEEK_SET
        self.chunked_file.seek(512 * 1024)
        self.assertEqual(self.chunked_file.position, 512 * 1024)

    def test_seek_cur(self):
        # SEEK_CUR
        self.chunked_file.seek(512 * 1024)
        self.chunked_file.seek(256, os.SEEK_CUR)
        self.assertEqual(self.chunked_file.position, 512 * 1024 + 256)

    def test_seek_end(self):
        # SEEK_END
        self.chunked_file.seek(-256, os.SEEK_END)
        self.assertEqual(self.chunked_file.position, self.file_size - 256)

    def test_get_missing_chunk_ranges(self):
        # Remove some chunks
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_1"))
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_3"))

        start = self.chunk_size
        end = self.chunk_size * 4 - 1
        missing_ranges = [
            mr for mr in self.chunked_file.missing_chunks_generator(start, end)
        ]

        expected_ranges = [
            (1, self.chunk_size * 1, self.chunk_size * 2 - 1),
            (3, self.chunk_size * 3, self.chunk_size * 4 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

    def test_get_missing_chunk_ranges_slice(self):
        # Remove some chunks
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_1"))
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_3"))

        start = self.chunk_size
        end = self.chunk_size * 3 - 1
        missing_ranges = [
            mr for mr in self.chunked_file.missing_chunks_generator(start, end)
        ]

        expected_ranges = [
            (1, self.chunk_size * 1, self.chunk_size * 2 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

    def test_get_missing_chunk_ranges_slice_no_download(self):
        # Remove some chunks
        shutil.rmtree(self.chunked_file.chunk_dir)

        start = self.chunk_size
        end = self.chunk_size * 2 - 1
        missing_ranges = [
            mr for mr in self.chunked_file.missing_chunks_generator(start, end)
        ]

        expected_ranges = [
            (1, self.chunk_size, self.chunk_size * 2 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

    def test_get_missing_chunk_ranges_slice_no_download_not_chunk_size_ranges(self):
        # Remove some chunks
        shutil.rmtree(self.chunked_file.chunk_dir)

        start = self.chunk_size // 3
        end = self.chunk_size * 2 + self.chunk_size // 3
        missing_ranges = [
            mr for mr in self.chunked_file.missing_chunks_generator(start, end)
        ]

        expected_ranges = [
            (0, 0, self.chunk_size - 1),
            (1, self.chunk_size, self.chunk_size * 2 - 1),
            (2, self.chunk_size * 2, self.chunk_size * 3 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

    def test_get_missing_chunk_ranges_whole_file(self):
        # Remove some chunks
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_1"))
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_3"))

        missing_ranges = [mr for mr in self.chunked_file.missing_chunks_generator()]

        expected_ranges = [
            (1, self.chunk_size * 1, self.chunk_size * 2 - 1),
            (3, self.chunk_size * 3, self.chunk_size * 4 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

    def test_finalize_file(self):
        self.chunked_file.finalize_file()

        with open(self.file_path, "rb") as f:
            data = f.read()

        self.assertEqual(data, self.data)
        os.remove(self.file_path)

    def test_finalize_file_chunk_missing(self):
        # Remove a chunk
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_1"))
        with self.assertRaises(ValueError):
            self.chunked_file.finalize_file()

    def test_is_complete_chunk_missing(self):
        # Remove a chunk
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_1"))
        self.assertFalse(self.chunked_file.is_complete())

    def test_is_complete_chunk_size_incorrect(self):
        # Create a chunk with incorrect size
        with open(os.path.join(self.chunked_file.chunk_dir, ".chunk_1"), "wb") as f:
            f.write(os.urandom(self.chunk_size // 2))
        self.assertFalse(self.chunked_file.is_complete())

    def test_is_complete_chunk_size_correct(self):
        self.assertTrue(self.chunked_file.is_complete())

    def test_md5_checksum(self):
        expected_md5 = hashlib.md5()
        for i in range(self.chunks_count):
            with open(
                os.path.join(self.chunked_file.chunk_dir, ".chunk_{}".format(i)), "rb"
            ) as f:
                while True:
                    data = f.read(8192)
                    if not data:
                        break
                    expected_md5.update(data)

        self.assertEqual(expected_md5.hexdigest(), self.chunked_file.md5_checksum())

    def test_md5_checksum_chunk_missing(self):
        # Remove a chunk
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_1"))
        with self.assertRaises(ValueError):
            self.chunked_file.md5_checksum()

    def test_finalize_file_md5(self):
        self.chunked_file.finalize_file()

        with open(self.file_path, "rb") as f:
            data = f.read()

        self.assertEqual(data, self.data)

        combined_md5 = hashlib.md5(data).hexdigest()
        self.assertEqual(combined_md5, self.chunked_file.md5_checksum())

        os.remove(self.file_path)

    def test_file_removed_by_parallel_process_after_opening(self):
        shutil.rmtree(self.chunked_file.chunk_dir, ignore_errors=True)
        self.chunked_file._file_size = None
        with self.assertRaises(ChunkedFileDoesNotExist):
            self.chunked_file.file_size

    def test_file_finalized_by_parallel_process_after_opening(self):
        self.chunked_file.finalize_file()
        self.chunked_file.delete()
        self.chunked_file._file_size = None
        with self.assertRaises(ChunkedFileDoesNotExist):
            self.chunked_file.file_size

    def test_file_finalized_by_parallel_process_after_opening_writing(self):
        self.chunked_file.finalize_file()
        self.chunked_file.delete()
        with self.assertRaises(ChunkedFileDoesNotExist):
            self.chunked_file.write_chunk(0, self.data[0 : self.chunk_size])

    def test_file_finalized_by_parallel_process_after_opening_locking(self):
        self.chunked_file.finalize_file()
        self.chunked_file.delete()
        with self.assertRaises(ChunkedFileDoesNotExist):
            with self.chunked_file.lock_chunks(0):
                pass


# The expected number of bytes taken up by files used in the diskcache
# for chunked files.
EXPECTED_DISKCACHE_SIZE = 32768


TOTAL_CHUNKED_FILE_SIZE = TEST_FILE_SIZE + EXPECTED_DISKCACHE_SIZE


class TestChunkedFileDirectoryManager(unittest.TestCase):
    def setUp(self):
        self.base_dir = tempfile.mkdtemp()
        for files in [
            ["file1.txt"],
            ["nested_once", "file2.txt"],
            ["nested", "nested_twice", "file3.txt"],
        ]:
            file_path = os.path.join(self.base_dir, *files)
            chunked_file = ChunkedFile(file_path)
            chunked_file.file_size = TEST_FILE_SIZE
            _write_test_data_to_chunked_file(chunked_file)

    def tearDown(self):
        shutil.rmtree(self.base_dir, ignore_errors=True)

    def test_listing_chunked_files(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted(
                [
                    os.path.join(self.base_dir, "file1.txt" + CHUNK_SUFFIX),
                    os.path.join(
                        self.base_dir, "nested_once", "file2.txt" + CHUNK_SUFFIX
                    ),
                    os.path.join(
                        self.base_dir,
                        "nested",
                        "nested_twice",
                        "file3.txt" + CHUNK_SUFFIX,
                    ),
                ]
            ),
        )

    def test_get_chunked_file_stats(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        stats = manager._get_chunked_file_stats()

        for file_path, file_stats in stats.items():
            self.assertEqual(file_stats["size"], TOTAL_CHUNKED_FILE_SIZE)
            expected_last_access_time = 0
            for dirpath, _, filenames in os.walk(file_path):
                for filename in filenames:
                    expected_last_access_time = max(
                        expected_last_access_time,
                        os.path.getatime(os.path.join(dirpath, filename)),
                    )
            self.assertEqual(file_stats["last_access_time"], expected_last_access_time)

    def test_evict_files_exact_file_size_sum(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        self.assertEqual(
            TOTAL_CHUNKED_FILE_SIZE * 3,
            manager.evict_files(TOTAL_CHUNKED_FILE_SIZE * 3),
        )
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted([]),
        )

    def test_evict_files_more_than_file_size_sum(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        self.assertEqual(
            TOTAL_CHUNKED_FILE_SIZE * 3,
            manager.evict_files(TOTAL_CHUNKED_FILE_SIZE * 3 + 12),
        )
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted([]),
        )

    def test_evict_files_exact_file_size(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        self.assertEqual(
            TOTAL_CHUNKED_FILE_SIZE, manager.evict_files(TOTAL_CHUNKED_FILE_SIZE)
        )
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted(
                [
                    os.path.join(
                        self.base_dir, "nested_once", "file2.txt" + CHUNK_SUFFIX
                    ),
                    os.path.join(
                        self.base_dir,
                        "nested",
                        "nested_twice",
                        "file3.txt" + CHUNK_SUFFIX,
                    ),
                ]
            ),
        )

    def test_evict_files_less_than_file_size(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        self.assertEqual(
            TOTAL_CHUNKED_FILE_SIZE, manager.evict_files(TOTAL_CHUNKED_FILE_SIZE - 12)
        )
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted(
                [
                    os.path.join(
                        self.base_dir, "nested_once", "file2.txt" + CHUNK_SUFFIX
                    ),
                    os.path.join(
                        self.base_dir,
                        "nested",
                        "nested_twice",
                        "file3.txt" + CHUNK_SUFFIX,
                    ),
                ]
            ),
        )

    def test_evict_files_more_than_file_size(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        self.assertEqual(
            TOTAL_CHUNKED_FILE_SIZE * 2,
            manager.evict_files(TOTAL_CHUNKED_FILE_SIZE + 12),
        )
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted(
                [
                    os.path.join(
                        self.base_dir,
                        "nested",
                        "nested_twice",
                        "file3.txt" + CHUNK_SUFFIX,
                    ),
                ]
            ),
        )

    def test_evict_files_more_than_twice_file_size(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        self.assertEqual(
            TOTAL_CHUNKED_FILE_SIZE * 3,
            manager.evict_files(TOTAL_CHUNKED_FILE_SIZE * 2 + 12),
        )
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted([]),
        )

    def test_evict_files_zero_bytes(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        self.assertEqual(0, manager.evict_files(0))
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted(
                [
                    os.path.join(self.base_dir, "file1.txt" + CHUNK_SUFFIX),
                    os.path.join(
                        self.base_dir, "nested_once", "file2.txt" + CHUNK_SUFFIX
                    ),
                    os.path.join(
                        self.base_dir,
                        "nested",
                        "nested_twice",
                        "file3.txt" + CHUNK_SUFFIX,
                    ),
                ]
            ),
        )

    def test_limit_files_no_eviction_needed(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        manager.limit_files(TOTAL_CHUNKED_FILE_SIZE * 3)
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted(
                [
                    os.path.join(self.base_dir, "file1.txt" + CHUNK_SUFFIX),
                    os.path.join(
                        self.base_dir, "nested_once", "file2.txt" + CHUNK_SUFFIX
                    ),
                    os.path.join(
                        self.base_dir,
                        "nested",
                        "nested_twice",
                        "file3.txt" + CHUNK_SUFFIX,
                    ),
                ]
            ),
        )

    def test_limit_files_some_eviction_needed(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        manager.limit_files(TOTAL_CHUNKED_FILE_SIZE * 2)
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted(
                [
                    os.path.join(
                        self.base_dir, "nested_once", "file2.txt" + CHUNK_SUFFIX
                    ),
                    os.path.join(
                        self.base_dir,
                        "nested",
                        "nested_twice",
                        "file3.txt" + CHUNK_SUFFIX,
                    ),
                ]
            ),
        )

    def test_limit_files_all_evicted(self):
        manager = ChunkedFileDirectoryManager(self.base_dir)
        manager.limit_files(TOTAL_CHUNKED_FILE_SIZE - 12)
        self.assertEqual(
            sorted(list(manager._get_chunked_file_dirs())),
            sorted([]),
        )
