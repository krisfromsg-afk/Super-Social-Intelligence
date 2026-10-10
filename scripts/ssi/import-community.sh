#!/usr/bin/env bash
set -euo pipefail

# Runs on a dedicated feature branch in CI with permissions: contents:write.
# Source code belongs to ChatbotX, retains upstream MIT notice.
# No proprietary history is transferred to SSI.

readonly EXPECTED="f1ca4a8f74cc08ca68d601ba2ce0e58bd9c5e67c"
readonly SOURCE_REPO="https://github.com/ChatbotXIO/ChatbotX.git"
readonly WORK="${RUNNER_TEMP:-/tmp}/ssi-chatbotx-community"
readonly REF="feat/ssi-clean-history-rebuild"

[[ "${SSI_LICENSE_REVIEW_APPROVED:-}" == "yes" ]] || { echo "STOP-SHIP: upstream sync requires explicit source/license review first" >&2; exit 1; }
[[ "${UPSTREAM_SHA:-$EXPECTED}" == "$EXPECTED" ]] || { echo "Pinned SHA mismatch; require reviewed sync change" >&2; exit 1; }
[[ "${GITHUB_REF_NAME:-$REF}" == "$REF" ]] || { echo "Unexpected target branch" >&2; exit 1; }
[[ ! -e apps/builder/src/enterprise ]] || { echo "Refusing to import on top of prohibited folder" >&2; exit 1; }
command -v rsync >/dev/null
command -v git >/dev/null

rm -rf "$WORK"
mkdir -p "$WORK"
git -C "$WORK" init -q
git -C "$WORK" remote add origin "$SOURCE_REPO"
git -C "$WORK" fetch --quiet --depth=1 origin "$EXPECTED"
git -C "$WORK" checkout --quiet --detach "$EXPECTED"
[[ "$(git -C "$WORK" rev-parse HEAD)" == "$EXPECTED" ]]

rsync -a "$WORK/" ./ \
  --exclude='/.git/' \
  --exclude='/.github/workflows/' \
  --exclude='/README.md' \
  --exclude='/docs/ssi/' \
  --exclude='/scripts/ssi/' \
  --exclude='/apps/builder/src/enterprise/' \
  --exclude='/packages/database/src/schema/enterprise/' \
  --exclude='/packages/database/src/relations/enterprise/' \
  --exclude='**/.git/' \
  --exclude='**/.env' \
  --exclude='**/.env.local'

# Original MIT/copyright notice must remain unchanged.
cmp "$WORK/LICENSE" LICENSE
test ! -e apps/builder/src/enterprise
test ! -e packages/database/src/schema/enterprise
test ! -e packages/database/src/relations/enterprise

# Hard fail on unexpected nested commercial licenses. Never delete only a LICENSE
# while preserving the contents it governs.
if find apps packages integrations -type f \( -iname 'LICENSE' -o -iname 'LICENSE.*' -o -iname 'NOTICE' -o -iname 'NOTICE.*' \) -print0 | xargs -0 -r grep -il 'ChatbotX Commercial License' | grep -q .; then
  echo 'STOP-SHIP: nested commercial licensing needs review' >&2
  exit 1
fi

if git status --short | grep -q .; then
  git add -A
  if git diff --cached --name-only | grep -E '^(apps/builder/src/enterprise|packages/database/src/(schema|relations)/enterprise)(/|$)'; then
    echo 'Prohibited commercial code included in git index' >&2; exit 1
  fi
  if git ls-files | grep -E '^(apps/builder/src/enterprise|packages/database/src/(schema|relations)/enterprise)(/|$)'; then
    echo 'Prohibited commercial code exists in resulting git tree' >&2; exit 1
  fi
  git -c user.name="ssi-foundation-bot" -c user.email="actions@users.noreply.github.com" \
    commit -m "feat: import pinned ChatbotX MIT Community snapshot (no enterprise)" 
  git push origin "HEAD:$REF"
fi
