#!/bin/sh
# Generate a C header with the default ini bytes of the micro sfx.
#
# usage: gen_default_ini.sh <ini file> <output header>
#
# POSIX sh only: the script runs from config.status on GNU, BSD and busybox
# userlands

set -e

src=$1
out=$2

if test -z "$src" || test -z "$out"; then
    echo "usage: gen_default_ini.sh <ini file> <output header>" >&2
    exit 1
fi
if test ! -f "$src"; then
    echo "gen_default_ini.sh: no such ini file: $src" >&2
    exit 1
fi

# a literal tab, a tab escape is not portable in sed replacement text
tab=$(printf '\t')
base=$(basename "$src")
tmp="$out.tmp$$"

{
    printf '/* generated from %s, do not edit */\n' "$base"
    printf 'static const unsigned char php_micro_default_ini[] = {\n'
    # drop CR so a checkout with windows line endings bakes the same bytes
    # od line wrapping and padding differ between userlands, normalize the
    # whitespace first and split the values with sed
    tr -d '\r' < "$src" \
        | od -An -v -tu1 \
        | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e '/^$/d' \
              -e 's/[[:space:]][[:space:]]*/, /g' -e 's/$/,/' \
        | sed -e "s/^/${tab}/"
    # two trailing NULs, the ini parser needs a terminated string
    printf '%s0, 0\n' "$tab"
    printf '};\n'
} > "$tmp"

mv "$tmp" "$out"
