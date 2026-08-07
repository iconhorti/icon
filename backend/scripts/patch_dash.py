"""
DEPRECATED — do not run.

This script used to inject typo-laden stage string constants into
routers/dashboard.py. Dashboard now imports slug stages exclusively from
constants/stages.py. Keeping this file only so old docs/scripts that
reference it fail safely instead of reintroducing the bug.
"""
import sys

print(
    "patch_dash.py is deprecated.\n"
    "Stage vocabulary lives in backend/constants/stages.py.\n"
    "If you need to fix legacy DB rows, run: python scripts/migrate_stages.py",
    file=sys.stderr,
)
sys.exit(1)
