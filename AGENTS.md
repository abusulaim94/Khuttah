# Khuttah repository workflow

The user has authorised committing and pushing completed changes to GitHub automatically. After finishing requested work and passing checks appropriate to the change, commit the relevant changes and push to `origin` (`https://github.com/abusulaim94/Khuttah.git`). Do not ask for push confirmation again.

The normal working branch is `main`. Its post-commit hook already attempts an automatic push. Verify the remote branch contains the completed commit; if the hook did not push successfully, resolve the failure and push explicitly. Do not force-push or overwrite unrelated work.

Use the repository's configured `abusulaim94` commit identity. Report the commit and whether the push succeeded. A successful push triggers GitHub Actions and GitHub Pages; report deployment as complete only after verifying it.
