# Jak commitować z CI/CD

### Format:

```
<type>(<scope>): <subject>

<optional body>

<optional footer>
```

### Typy:

- `feat`: Nowa funkcjonalność
- `fix`: Poprawka błędu
- `docs`: Dokumentacja
- `style`: Formatowanie kodu
- `refactor`: Refaktoryzacja
- `test`: Testy
- `chore`: Narzędzia, konfiguracja
- `perf`: Wydajność
- `ci`: CI/CD
- `build`: System budowania

### Przykłady:

**Nowa funkcjonalność:**

```bash
git commit -m "feat(reservation): Add appointment cancellation endpoint"
```

**Poprawka błędu:**

```bash
git commit -m "fix(gateway): Resolve JWT token validation issue"
```

**Dokumentacja:**

```bash
git commit -m "docs: Update API documentation with new endpoints"
```

**CI/CD:**

```bash
git commit -m "ci: Improve Docker build caching strategy"
```

**Breaking change:**

```bash
git commit -m "feat(api)!: Change authentication response format

BREAKING CHANGE: Response now includes 'expiresIn' field instead of 'expires_at'"
```

### Dlaczego to ważne?

1. **Automatyczne generowanie CHANGELOG**
2. **Semantic versioning** (1.0.0 → 1.1.0 dla feat, 1.0.1 dla fix)
3. **Lepsze zrozumienie historii zmian**
4. **CI/CD może podejmować decyzje na podstawie typu commita**

### Przydatne komendy:

```bash
# Zobacz ostatnie commity
git log --oneline --graph -10

# Zmień ostatni commit message
git commit --amend

# Sprawdź co będzie w commicie
git status
git diff --staged

# Test lokalny przed commitem
./scripts/test-ci-local.sh
```

### Po pushu:

1. Idź na GitHub → zakładka **Actions**
2. Zobacz jak działa CI/CD pipeline
3. Monitoruj logi w czasie rzeczywistym
4. Pipeline automatycznie:
   - Uruchomi testy
   - Zbuduje obrazy Docker
   - Zwaliduje konfigurację
   - Przygotuje deployment (jeśli na main/develop)
