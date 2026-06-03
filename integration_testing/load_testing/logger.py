"""
Centralized colored logging for Kolibri Load Testing CLI

Provides consistent colored output across all modules.
"""

import click


def success(msg):
    """Print success message in green"""
    click.echo(click.style(f"✓ {msg}", fg="green"))


def info(msg):
    """Print info message in blue"""
    click.echo(click.style(msg, fg="blue"))


def warning(msg):
    """Print warning message in yellow"""
    click.echo(click.style(f"⚠ {msg}", fg="yellow"))


def error(msg):
    """Print error message in red"""
    click.echo(click.style(f"✗ {msg}", fg="red"))


def step(num, total, msg):
    """Print step header in cyan"""
    click.echo(click.style(f"\n[{num}/{total}] {msg}", fg="cyan", bold=True))


def section(msg):
    """Print section header in magenta"""
    click.echo(click.style(f"\n{msg}", fg="magenta", bold=True))


def plain(msg):
    """Print plain message (for detailed info)"""
    click.echo(f"  {msg}")
