#!/bin/bash

# Quick Release Script for jslog
# Usage: ./scripts/release.sh [patch|minor|major]

set -e  # Exit on error

VERSION_TYPE=${1:-patch}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE} jslog Release Script${NC}"
echo ""

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED} Git working directory is not clean!${NC}"
  echo "Commit or stash your changes first."
  git status --short
  exit 1
fi

# Check if on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${YELLOW}  You're on branch: $CURRENT_BRANCH${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Current version: ${NC}v$CURRENT_VERSION"

# Update version
echo -e "${BLUE}Bumping version (${VERSION_TYPE})...${NC}"
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: ${NC}v$NEW_VERSION"

# Run tests
echo ""
echo -e "${BLUE}Running tests...${NC}"
npm run typecheck
npm run build
npm test

echo ""
echo -e "${GREEN} All tests passed!${NC}"

# Update CHANGELOG if it exists
if [ -f "CHANGELOG.md" ]; then
  echo ""
  echo -e "${YELLOW} Don't forget to update CHANGELOG.md!${NC}"
  echo "Add release notes for v$NEW_VERSION"
  read -p "Press enter when ready to continue..."
fi

# Commit and tag
echo ""
echo -e "${BLUE}Creating commit and tag...${NC}"
git add package.json package-lock.json
git commit -m "Release v$NEW_VERSION"
git tag "v$NEW_VERSION"

# Push
echo ""
echo -e "${BLUE}Pushing to GitHub...${NC}"
git push origin $CURRENT_BRANCH
git push origin "v$NEW_VERSION"

echo ""
echo -e "${GREEN} Released v$NEW_VERSION!${NC}"
echo ""
echo -e "Monitor the release:"
echo -e "${BLUE}→ Actions: ${NC}https://github.com/omdxp/jslog/actions"
echo -e "${BLUE}→ Releases: ${NC}https://github.com/omdxp/jslog/releases"
echo -e "${BLUE}→ NPM: ${NC}https://www.npmjs.com/package/@omdxp/jslog"
echo ""
