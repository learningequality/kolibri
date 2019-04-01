#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Derived from http://scottlobdell.me/2015/04/gamifying-test-coverage-project/
# Before running this script, first run tests with coverage using:
#  tox -e py3.4
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from collections import Counter
from subprocess import PIPE
from subprocess import Popen


LINE_COUNT_THRESH = 50


class ExcludeLineParser(object):
    @classmethod
    def get_missing_lines_for_filename(cls, filename):
        command = "coverage report -m %s" % filename
        process = Popen(command.split(), stdout=PIPE)
        output, _ = process.communicate()
        return cls._get_excluded_lines(output)

    @classmethod
    def _get_excluded_lines(cls, coverage_output):
        excluded_line_numbers = []
        ignore_line_count = 2
        ignore_column_count = 6
        lines = [
            line for line in coverage_output.split("\n")[ignore_line_count:] if line
        ]
        for line in lines:
            exclude_line_strings = line.split()[ignore_column_count:]
            for exclude_line_string in exclude_line_strings:
                exclude_line_string = exclude_line_string.replace(",", "").replace(
                    " ", ""
                )
                exclude_lines = cls._convert_exclude_line_string_to_ints(
                    exclude_line_string
                )
                excluded_line_numbers.extend(exclude_lines)

        return excluded_line_numbers

    @classmethod
    def _convert_exclude_line_string_to_ints(cls, exclude_line_string):
        if "->" in exclude_line_string:
            return [int(exclude_line_string.split("->")[0])]
        if "-" in exclude_line_string:
            line_start, line_end = exclude_line_string.split("-")
            if line_end == "exit":
                line_end = line_start
            return range(int(line_start), int(line_end) + 1)
        else:
            try:
                line_number = int(exclude_line_string)
            except ValueError:
                print("Error for values ({})".format(exclude_line_string))
                return []
            return [line_number]


def _get_output_from_pipe_command(command_with_pipes):
    piped_commands = [command.strip() for command in command_with_pipes.split("|")]
    previous_process = None
    for command in piped_commands:
        process = Popen(
            command.split(),
            stdin=previous_process and previous_process.stdout,
            stdout=PIPE,
        )
        previous_process = process
    output, err = previous_process.communicate()
    return output


def get_python_files():
    full_command = (
        "find kolibri | grep py | grep -v pyc | grep -v test | grep -v virtualenv"
    )
    output = _get_output_from_pipe_command(full_command)
    filenames = [filename for filename in output.split("\n") if filename]
    return filenames


def git_blame_on_files(file_list):
    total_counter = Counter()
    miss_counter = Counter()
    for index, filename in enumerate(file_list):
        full_command = (
            "git blame --line-porcelain %s | grep author | grep -v author-" % filename
        )
        output = _get_output_from_pipe_command(full_command)

        git_scorer = GitScorer(output)
        counter = git_scorer.get_author_counts()

        line_to_author = git_scorer.get_line_to_author()
        non_covered_lines = ExcludeLineParser.get_missing_lines_for_filename(filename)
        miss_counter += attribute_missing_coverage_to_author(
            line_to_author, non_covered_lines
        )

        total_counter += counter
    return total_counter, miss_counter


def apply_threshold_to_counter(counter):
    for key in counter.keys():
        if counter[key] < LINE_COUNT_THRESH:
            del counter[key]


def attribute_missing_coverage_to_author(line_to_author, non_covered_lines):
    author_to_miss_count = Counter()
    for line_number in non_covered_lines:
        try:
            author = line_to_author[line_number]
        except KeyError:
            return Counter()
        author_to_miss_count[author] += 1
    return author_to_miss_count


class GitScorer(object):
    def __init__(self, gblame_output):
        self.counts_this_file = Counter()
        self.line_to_author = {}
        self._parse_git_blame_output(gblame_output)

    def _get_author_from_line(self, line):
        author = line.replace("author ", "")
        if author.startswith(" ") or author.startswith("\t"):
            return None
        return author

    def _parse_git_blame_output(self, git_blame_output):
        lines = git_blame_output.split("\n")
        for index, line in enumerate(lines):
            if not line:
                continue
            line_number = index + 1
            author = self._get_author_from_line(line)
            if author:
                self.counts_this_file[author] += 1
            self.line_to_author[line_number] = author

    def get_author_counts(self):
        return self.counts_this_file

    def get_line_to_author(self):
        return self.line_to_author


def get_test_coverage_percent_per_author(line_counter, miss_counter):
    author_to_test_coverage = {}
    for author in line_counter.keys():
        line_count = line_counter[author]
        miss_count = miss_counter.get(author, 0)
        miss_percent = float(miss_count) / line_count
        test_coverage_percent = 1.0 - miss_percent
        author_to_test_coverage[author] = test_coverage_percent
    return author_to_test_coverage


if __name__ == "__main__":
    python_files = get_python_files()
    line_counter, miss_counter = git_blame_on_files(python_files)
    apply_threshold_to_counter(line_counter)
    author_to_test_coverage = get_test_coverage_percent_per_author(
        line_counter, miss_counter
    )
    rank = 1
    for author, cov in sorted(
        author_to_test_coverage.items(), key=lambda t: t[1], reverse=True
    ):
        print(
            "#%s. %s: %.2d%% coverage (%d out of %d lines)"
            % (
                rank,
                author,
                cov * 100,
                line_counter[author] - miss_counter[author],
                line_counter[author],
            )
        )
        rank += 1
