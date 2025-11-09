#!/bin/bash

# ==============================================
# Quick Commit Helper - automatyczny commit
# ==============================================

# Kolory
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Quick Commit Helper"
echo "======================="
echo ""

# 1. Sprawdź status
echo "📋 Status repozytorium:"
git status --short
echo ""

# 2. Pobierz typ commita
echo "📝 Wybierz typ commita:"
echo "  1) feat      - Nowa funkcjonalność"
echo "  2) fix       - Poprawka błędu"
echo "  3) docs      - Dokumentacja"
echo "  4) style     - Formatowanie"
echo "  5) refactor  - Refaktoryzacja"
echo "  6) test      - Testy"
echo "  7) chore     - Narzędzia/konfiguracja"
echo "  8) ci        - CI/CD"
echo "  9) perf      - Wydajność"
echo ""
read -p "Wybierz numer (1-9): " type_choice

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
    *) echo -e "${RED}Nieprawidłowy wybór${NC}"; exit 1 ;;
esac

# 3. Opcjonalny scope
echo ""
read -p "Scope (opcjonalnie, np: api, gateway, frontend): " scope

# 4. Subject
echo ""
read -p "Krótki opis (np: Add user authentication): " subject

if [ -z "$subject" ]; then
    echo -e "${RED}Opis nie może być pusty!${NC}"
    exit 1
fi

# 5. Dodatkowy opis
echo ""
read -p "Dodatkowy opis (opcjonalnie, Enter aby pominąć): " body

# 6. Zbuduj commit message
if [ -n "$scope" ]; then
    commit_msg="$commit_type($scope): $subject"
else
    commit_msg="$commit_type: $subject"
fi

if [ -n "$body" ]; then
    commit_msg="$commit_msg

$body"
fi

# 7. Pokaż podgląd
echo ""
echo -e "${YELLOW}Podgląd commita:${NC}"
echo "---"
echo "$commit_msg"
echo "---"
echo ""

# 8. Potwierdź
read -p "Kontynuować? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${YELLOW}Anulowano${NC}"
    exit 0
fi

# 9. Dodaj pliki
git add .

# 10. Commit
git commit -m "$commit_msg"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Commit utworzony pomyślnie!${NC}"
    echo ""
    
    # 11. Zapytaj o push
    read -p "Czy wypchnąć zmiany do zdalnego repo? (y/n): " push_confirm
    
    if [ "$push_confirm" == "y" ] || [ "$push_confirm" == "Y" ]; then
        current_branch=$(git branch --show-current)
        echo ""
        echo "Pushing to origin/$current_branch..."
        git push origin "$current_branch"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ Zmiany wypchnięte pomyślnie!${NC}"
            echo ""
            echo "📊 Sprawdź Actions na GitHub:"
            repo_url=$(git config --get remote.origin.url | sed 's/\.git$//')
            echo "${repo_url}/actions"
        else
            echo -e "${RED}❌ Błąd podczas push${NC}"
        fi
    else
        echo ""
        echo -e "${YELLOW}💡 Aby wypchnąć później:${NC}"
        echo "   git push origin $(git branch --show-current)"
    fi
else
    echo -e "${RED}❌ Błąd podczas tworzenia commita${NC}"
    exit 1
fi
