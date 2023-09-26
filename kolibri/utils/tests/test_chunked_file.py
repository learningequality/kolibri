import hashlib
import math
import os
import shutil
import unittest

from kolibri.utils.file_transfer import ChunkedFile
from kolibri.utils.file_transfer import ChunkedFileDoesNotExist


class TestChunkedFile(unittest.TestCase):
    def setUp(self):
        self.file_path = "test_file"

        self.chunk_size = ChunkedFile.chunk_size
        self.file_size = (1024 * 1024) + 731

        self.chunked_file = ChunkedFile(self.file_path)

        # Create dummy chunks
        self.chunks_count = int(
            math.ceil(float(self.file_size) / float(self.chunk_size))
        )
        self.data = b""
        for i in range(self.chunks_count):
            with open(
                os.path.join(self.chunked_file.chunk_dir, ".chunk_{}".format(i)), "wb"
            ) as f:
                size = (
                    self.chunk_size
                    if i < self.chunks_count - 1
                    else (self.file_size % self.chunk_size)
                )
                to_write = os.urandom(size)
                f.write(to_write)
                self.data += to_write

        self.chunked_file.file_size = self.file_size

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
