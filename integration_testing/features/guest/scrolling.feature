
# bar visibly pinned, looking upward
(fix, 0) AND up

  # bar stays visibly pinned
  => (fix, 0)

# bar visibly pinned, looking downward
(fix, 0) AND down

  # attach at content position
  => (attach, content_pos)

# bar invisibly pinned, looking upward
(fix, -H) AND up

  # attach at content position
  => (attach, content_pos)

# bar invisibly pinned, looking downward
(fix, -H) AND down

  # bar stays invisibly pinned
  => (fix, -H)

# attached, looking downward
(attach, bar_pos) AND down

  # bar fully offscreen
  bar_vis <= -H

    # fix bar just offscreen
    => (fix, -H)

  # bar partially offscreen
  -H < bar_vis <= 0

    # stay attached at bar position
    => (attach, bar_pos)

  # bar somehow too low
  bar_vis > 0

    # re-attach at content position
    => (attach, content_pos)

# attached, looking upward
(attach, bar_pos) AND up

  # bar partially offscreen
  -H < bar_vis <= 0

    # bar moving slowly
    delta < (0 - bar_vis) / 2

      # stay attached at bar position
      => (attach, bar_pos)

    # bar moving quickly
    else

      # pin bar visibly
      => (fix, 0)

  # bar too low
  bar_vis > 0

    # pin bar visibly
    => (fix, 0)

  # bar too high
  bar_vis < -H

    # re-attach at content position
    => (attach, content_pos)

