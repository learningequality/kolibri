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
        new_data = os.urandom(BLOCK_SIZE)
        os.remove(
            os.path.join(
                self.chunked_file.chunk_dir, ".chunk_{}".format(self.chunks_count - 2)
            )
        )
        self.chunked_file.seek((self.chunks_count - 2) * BLOCK_SIZE)
        self.chunked_file.write(new_data)

        self.chunked_file.seek((self.chunks_count - 2) * BLOCK_SIZE)
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
                self.chunked_file.chunk_dir, ".chunk_{}".format(self.chunks_count - 2)
            )
        )
        self.chunked_file.seek(0)
        self.chunked_file.write(new_data)

        self.chunked_file.seek(BLOCK_SIZE * (self.chunks_count - 2))
        data = self.chunked_file.read(BLOCK_SIZE)
        self.assertEqual(
            data,
            new_data[
                BLOCK_SIZE
                * (self.chunks_count - 2) : BLOCK_SIZE
                * (self.chunks_count - 1)
            ],
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
            mr[:2] for mr in self.chunked_file.next_missing_chunk_and_read(start, end)
        ]

        expected_ranges = [
            (self.chunk_size * 1, self.chunk_size * 2 - 1),
            (self.chunk_size * 3, self.chunk_size * 4 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

    def test_get_missing_chunk_ranges_slice(self):
        # Remove some chunks
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_1"))
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_3"))

        start = self.chunk_size
        end = self.chunk_size * 3 - 1
        missing_ranges = [
            mr[:2] for mr in self.chunked_file.next_missing_chunk_and_read(start, end)
        ]

        expected_ranges = [
            (self.chunk_size * 1, self.chunk_size * 2 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

    def test_get_missing_chunk_ranges_slice_no_download(self):
        # Remove some chunks
        shutil.rmtree(self.chunked_file.chunk_dir)

        start = self.chunk_size
        end = self.chunk_size * 2 - 1
        missing_ranges = [
            mr[:2] for mr in self.chunked_file.next_missing_chunk_and_read(start, end)
        ]

        expected_ranges = [
            (self.chunk_size, self.chunk_size * 2 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

    def test_get_missing_chunk_ranges_slice_no_download_not_chunk_size_ranges(self):
        # Remove some chunks
        shutil.rmtree(self.chunked_file.chunk_dir)

        start = self.chunk_size // 3
        end = self.chunk_size * 2 + self.chunk_size // 3
        missing_ranges = [
            mr[:2] for mr in self.chunked_file.next_missing_chunk_and_read(start, end)
        ]

        expected_ranges = [
            (0, self.chunk_size - 1),
            (self.chunk_size, self.chunk_size * 2 - 1),
            (self.chunk_size * 2, self.chunk_size * 3 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

    def test_get_missing_chunk_ranges_whole_file(self):
        # Remove some chunks
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_1"))
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_3"))

        missing_ranges = [
            mr[:2] for mr in self.chunked_file.next_missing_chunk_and_read()
        ]

        expected_ranges = [
            (self.chunk_size * 1, self.chunk_size * 2 - 1),
            (self.chunk_size * 3, self.chunk_size * 4 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

    def test_get_missing_chunk_ranges_reading(self):
        # Remove some chunks
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_1"))
        os.remove(os.path.join(self.chunked_file.chunk_dir, ".chunk_3"))

        start = self.chunk_size
        end = self.chunk_size * 4 - 1
        generator = self.chunked_file.next_missing_chunk_and_read(start, end)

        missing_range_1 = next(generator)

        # Make sure we don't read the first chunk as its before the start of the range
        self.assertEqual(b"".join(missing_range_1[2]), b"")

        # Seek past the first missing chunk to make sure we don't try to read it.
        # In normal operation, the missing chunk would be filled in with a write before
        # the next read, which would cause the read to skip past.
        self.chunked_file.seek(self.chunk_size * 2)

        missing_range_2 = next(generator)

        self.assertEqual(
            b"".join(missing_range_2[2]),
            self.data[self.chunk_size * 2 : self.chunk_size * 3],
        )

        expected_ranges = [
            (self.chunk_size * 1, self.chunk_size * 2 - 1),
            (self.chunk_size * 3, self.chunk_size * 4 - 1),
        ]
        self.assertEqual([missing_range_1[:2], missing_range_2[:2]], expected_ranges)

    def test_get_missing_chunk_ranges_slice_no_download_not_chunk_size_ranges_reading(
        self,
    ):
        # Remove some chunks
        shutil.rmtree(self.chunked_file.chunk_dir)

        start = self.chunk_size + self.chunk_size // 3
        end = self.chunk_size * 2 + self.chunk_size // 3
        missing = [
            mr for mr in self.chunked_file.next_missing_chunk_and_read(start, end)
        ]

        missing_ranges = [mr[:2] for mr in missing]

        expected_ranges = [
            (self.chunk_size, self.chunk_size * 2 - 1),
            (self.chunk_size * 2, self.chunk_size * 3 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

        output = b""

        for mr in missing:
            output += b"".join(mr[2])
            self.chunked_file.seek(mr[1] + 1)

        self.assertEqual(output, b"")

    def test_get_missing_chunk_ranges_slice_no_download_not_chunk_size_ranges_reading_include_first_chunk(
        self,
    ):
        # Remove some chunks
        shutil.rmtree(self.chunked_file.chunk_dir)

        start = self.chunk_size // 3
        end = self.chunk_size * 2 + self.chunk_size // 3
        missing = [
            mr for mr in self.chunked_file.next_missing_chunk_and_read(start, end)
        ]

        missing_ranges = [mr[:2] for mr in missing]

        expected_ranges = [
            (0, self.chunk_size - 1),
            (self.chunk_size, self.chunk_size * 2 - 1),
            (self.chunk_size * 2, self.chunk_size * 3 - 1),
        ]
        self.assertEqual(missing_ranges, expected_ranges)

        output = b""

        for mr in missing:
            output += b"".join(mr[2])
            self.chunked_file.seek(mr[1] + 1)

        self.assertEqual(output, b"")

    def test_get_missing_chunk_ranges_slice_no_download_not_chunk_size_ranges_reading_include_last_chunk(
        self,
    ):
        # Remove some chunks
        shutil.rmtree(self.chunked_file.chunk_dir)

        start = self.chunk_size + self.chunk_size // 3
        end = self.file_size - 7
        missing = [
            mr for mr in self.chunked_file.next_missing_chunk_and_read(start, end)
        ]

        missing_ranges = [mr[:2] for mr in missing]

        expected_ranges = [
            (self.chunk_size * i, min(self.file_size, self.chunk_size * (i + 1)) - 1)
            for i in range(1, self.chunks_count)
        ]
        self.assertEqual(missing_ranges, expected_ranges)

        output = b""

        for mr in missing:
            output += b"".join(mr[2])
            self.chunked_file.seek(mr[1] + 1)

        self.assertEqual(output, b"")

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
