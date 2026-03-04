#!/bin/sh
# Pre-commit hook: block commits that contain API keys or secrets.
# Install: npm run install-hooks  OR  cp scripts/pre-commit-check.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

for f in $(git diff --cached --name-only); do
  [ -f "$f" ] || continue
  if grep -qE 'gsk_[a-zA-Z0-9]{40,}|sk-[a-zA-Z0-9]{40,}|sk-ant-[a-zA-Z0-9-]{40,}' "$f" 2>/dev/null; then
    echo "ERROR: Possible API key detected in $f. Remove secrets before committing."
    echo "Use placeholders like gsk_your-key-here in .env.example"
    exit 1
  fi
done
exit 0
