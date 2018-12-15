
# looking upward, bar visibly pinned
up AND (fix, 0)

  # bar stays visibly pinned
  => (fix, 0)

# looking downward, bar visibly pinned
down AND (fix, 0)

  # attach at content position
  => (attach, contentPos)

# looking upward, bar invisibly pinned
up AND (fix, -H)

  # attach at content position minus bar height
  => (attach, contentPos - H)

# looking downward, bar invisibly pinned
down AND (fix, -H)

  # bar stays invisibly pinned
  => (fix, -H)

# looking downward and attached
down AND (attach, barTranslation)

  # bar fully offscreen
  barPos <= -H

    # fix bar just offscreen
    => (fix, -H)

  # bar partially offscreen
  -H < barPos <= 0

    # stay attached at bar position
    => (attach, barTranslation)

  # bar somehow too low
  barPos > 0

    # re-attach at content position
    => (attach, contentPos)

# attached, looking upward
up AND (attach, barTranslation)

  # bar partially offscreen
  -H < barPos <= 0

    # bar moving slowly
    delta < (0 - barPos) / 2

      # stay attached at bar position
      => (attach, barTranslation)

    # bar moving quickly
    else

      # pin bar visibly
      => (fix, 0)

  # bar too low
  barPos > 0

    # pin bar visibly
    => (fix, 0)

  # bar too high
  barPos < -H

    # re-attach at content position
    => (attach, contentPos)

