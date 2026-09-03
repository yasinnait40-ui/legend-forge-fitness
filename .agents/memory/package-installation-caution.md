---
name: Package installation caution
description: Environment side effects to check after dependency installation or preview setup.
---

Dependency installation and temporary preview setup can update tracked project metadata even when the requested change is unrelated.

**Why:** A verification install upgraded dependency ranges and lockfile entries, while starting a local preview added a port mapping to `.replit`.

**How to apply:** Before finishing a surgical change, inspect `git status` and restore any setup-only manifest or `.replit` edits so the final diff stays within scope.