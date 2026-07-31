# HUSHAE test suites

These live in the workspace, NOT in /tmp.

Measured the hard way during Sprint 2L: every suite written in earlier sprints
(search engine, promotion engine, defaults parity, money pipeline) was written
to /tmp, and /tmp is wiped between sessions. When Part 1 came to run the
regression pass, all five suites were gone — so "regression tested" would have
meant "the frontend still builds".

Run them all:

    node tests/run-all.mjs

Individually:

    node tests/cms.mjs        # CMS engine: slugs, validation, SEO, schedule
    node tests/cmsflow.mjs    # slug rename -> redirect chains, loop guard

Each exits non-zero on failure, so they can gate a deploy.
