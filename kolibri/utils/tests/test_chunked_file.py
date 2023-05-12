import hashlib
import math
import os
import shutil
import unittest

from kolibri.utils.file_transfer import BLOCK_SIZE
from kolibri.utils.file_transfer import ChunkedFile


class TestChunkedFile(unittest.TestCase):
    def setUp(self):
        self.file_path = "test_file"

        self.chunk_size = BLOCK_SIZE
        self.file_size = 1024 * 1024  # 1 MB

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
                to_write = os.urandom(self.chunk_size)
                f.write(to_write)
                self.data += to_write

        self.chunked_file.file_size = self.file_size

    def tearDown(self):
        shutil.rmtree(self.chunked_file.chunk_dir)

    def test_read(self):
        # Read from the beginning
        data = self.chunked_file.read(512)
        self.assertEqual(len(data), 512)

        # Read from the middle
        self.chunked_file.seek(512 * 1024)
        data = self.chunked_file.read(512)
        self.assertEqual(len(data), 512)

    def test_write(self):
        new_data = os.urandom(BLOCK_SIZE)
        os.remove(
            os.path.join(
                self.chunked_file.chunk_dir, ".chunk_{}".format(self.chunks_count - 1)
            )
        )
        self.chunked_file.seek(self.file_size - BLOCK_SIZE)
        self.chunked_file.write(new_data)

        self.chunked_file.seek(self.file_size - BLOCK_SIZE)
        data = self.chunked_file.read(BLOCK_SIZE)
        self.assertEqual(data, new_data)

    def test_write_whole_file(self):
        new_data = os.urandom(self.file_size)
        for i in range(self.chunks_count):
            os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_{}".format(i)))
        self.chunked_file.seek(0)
        self.chunked_file.write(new_data)

        self.chunked_file.seek(0)
        data = self.chunked_file.read()
        self.assertEqual(data, new_data)

    def test_write_fails_longer_than_file_size(self):
        new_data = os.urandom(256)
        self.chunked_file.seek(self.file_size)
        with self.assertRaises(EOFError):
            self.chunked_file.write(new_data)

    def test_write_ignores_overwrite(self):
        data = self.chunked_file.read(256)
        new_data = os.urandom(256)
        self.chunked_file.seek(0)
        self.chunked_file.write(new_data)
        self.chunked_file.seek(0)
        self.assertEqual(self.chunked_file.read(256), data)

    def test_write_whole_file_ignores_overwrite_writes_remainder(self):
        new_data = os.urandom(self.file_size)
        os.remove(
            os.path.join(
                self.chunked_file.chunk_dir, ".chunk_{}".format(self.chunks_count - 1)
            )
        )
        self.chunked_file.seek(0)
        self.chunked_file.write(new_data)

        self.chunked_file.seek(BLOCK_SIZE * (self.chunks_count - 1))
        data = self.chunked_file.read()
        self.assertEqual(data, new_data[-BLOCK_SIZE:])

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
        missing_ranges = list(
            self.chunked_file.next_missing_chunk_for_range_generator(start, end)
        )

        expected_ranges = [
            (self.chunk_size * 1, self.chunk_size * 2 - 1),
            (self.chunk_size * 3, self.chunk_size * 4 - 1),
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
