#!/usr/bin/env python3
"""Inline index.html + styles.css + main.js into a single-file build.

The published Artifact runs under a CSP that blocks every external host, so a
<link> or <script src> would silently fail there. This flattens the three
source files back into one document that carries its own CSS and JS.

    python build.py

Writes dist/em-studio.html — the fragment the Artifact tool expects (no
doctype, <html>, <head> or <body>; those are supplied at publish time).
"""

import base64
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")


def read(name):
    path = os.path.join(HERE, name)
    if not os.path.exists(path):
        sys.exit("missing source file: %s" % name)
    with io.open(path, encoding="utf-8") as fh:
        return fh.read()


def main():
    html = read("index.html")
    css = read("styles.css")
    js = read("main.js")

    title = re.search(r"<title>(.*?)</title>", html, re.S)
    title = title.group(1).strip() if title else "EM Studio"

    body = re.search(r"<body>(.*)</body>", html, re.S)
    if not body:
        sys.exit("index.html has no <body> block to extract")
    markup = body.group(1).strip()

    # project photos travel inside the file too, as data URIs
    def inline(m):
        with open(os.path.join(HERE, m.group(0)), "rb") as fh:
            return "data:image/jpeg;base64," + base64.b64encode(fh.read()).decode("ascii")
    markup = re.sub(r"img/[\w-]+\.jpg", inline, markup)

    out = u"<title>%s</title>\n\n<style>\n%s\n</style>\n\n%s\n\n<script>\n%s\n</script>\n" % (
        title, css.strip(), markup, js.strip()
    )

    if not os.path.isdir(DIST):
        os.makedirs(DIST)
    target = os.path.join(DIST, "em-studio.html")
    with io.open(target, "w", encoding="utf-8") as fh:
        fh.write(out)

    print("wrote %s (%d bytes)" % (target, len(out.encode("utf-8"))))


if __name__ == "__main__":
    main()
