# Background

Kolibri supports a very wide range of hardware and use cases -- from a single user running on an inexpensive smartphone,
to a laptop serving 50 students in a classroom, to a cloud server handling hundreds of requests per second. It's important
that developers track and improve Kolibri's performance to address the various use cases it may be used.

# Performance tracking and instrumentation

the `perftools` folder is meant to be a collection of tools and documentation to assess Kolibri's performance and see
any potential bottlenecks.

There is currently one subfolder:

- `stresstesting`: a set of micro-benchmarking scripts that hit a certain endpoint multiple times per second. This is
not meant as an end-to-end testing suite, but simply confirm and isolate performance bottlenecks confirmed by the user.
This will also help measure if any optimizations have any impact.
