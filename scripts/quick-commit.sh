#!/bin/bash

# ==============================================
# Quick Commit Helper - automatic commit
# ==============================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "Quick Commit Helper"
echo "======================="
echo ""

# Ensure we operate from the repository root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$REPO_ROOT" ]; then
    echo -e "${RED}This directory is not inside a Git repository.${NC}"
    exit 1
fi
cd "$REPO_ROOT" || exit 1

# 1. Check status
echo "Repository status:"
git status --short
echo ""

# 2. Choose commit type
echo "Choose commit type:"
echo "  1) feat      - New feature"
echo "  2) fix       - Bug fix"
echo "  3) docs      - Documentation"
echo "  4) style     - Formatting"
echo "  5) refactor  - Refactor"
echo "  6) test      - Tests"
echo "  7) chore     - Chores / configuration"
echo "  8) ci        - CI/CD"
echo "  9) perf      - Performance"
echo ""
read -p "Select number (1-9): " type_choice

case $type_choice in
    1) commit_type="feat" ;;
    2) commit_type="fix" ;;
    3) commit_type="docs" ;;
    4) commit_type="style" ;;
    5) commit_type="refactor" ;;
    6) commit_type="test" ;;
    7) commit_type="chore" ;;
    8) commit_type="ci" ;;
    9) commit_type="perf" ;;
    *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
esac

# 3. Optional scope
echo ""
read -p "Scope (optional, e.g.: api, gateway, frontend): " scope

# 4. Subject
echo ""
read -p "Short description (e.g.: Add user authentication): " subject

if [ -z "$subject" ]; then
    echo -e "${RED}Description cannot be empty!${NC}"
    exit 1
fi

# 5. Additional description
echo ""
# shellcheck disable=SC2162
read -p "Additional description (optional, press Enter to skip): " body

# 6. Build commit message
if [ -n "$scope" ]; then
    commit_msg="$commit_type($scope): $subject"
else
    commit_msg="$commit_type: $subject"
fi

if [ -n "$body" ]; then
    commit_msg="$commit_msg

$body"
fi

# 7. Show preview
echo ""
echo -e "${YELLOW}Commit preview:${NC}"
echo "---"
echo "$commit_msg"
echo "---"
echo ""

# 8. Confirm
read -p "Continue? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

# 9. Add files (whole repository)
git add -A

# 10. Commit
git commit -m "$commit_msg"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Commit created successfully!${NC}"
    echo ""
    
    # 11. Ask about push
    read -p "Push changes to remote repo? (y/n): " push_confirm
    
    if [ "$push_confirm" == "y" ] || [ "$push_confirm" == "Y" ]; then
        current_branch=$(git branch --show-current)
        echo ""
        echo "Pushing to origin/$current_branch..."
        git push origin "$current_branch"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}Changes pushed successfully!${NC}"
            echo ""
            echo "Check GitHub Actions:"
            repo_url=$(git config --get remote.origin.url | sed 's/\.git$//')
            echo "${repo_url}/actions"
        else
            echo -e "${RED}Error while pushing${NC}"
        fi
    else
        echo ""
        echo -e "${YELLOW}To push later:${NC}"
        echo "   git push origin $(git branch --show-current)"
    fi
else
    echo -e "${RED}Error while creating commit${NC}"
    exit 1
fi
