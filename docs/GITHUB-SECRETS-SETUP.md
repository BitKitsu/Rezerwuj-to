# Konfiguracja GitHub Secrets dla CI/CD

## Wymagane sekrety w GitHub

Aby pipeline CI/CD działał poprawnie, musisz skonfigurować następujące sekrety w ustawieniach repozytorium:

### 1. Przejdź do Settings → Secrets and variables → Actions

### 2. Dodaj następujące sekrety:

#### Dla deploymentu (staging i production):

| Secret Name         | Description                                   | Example                                           |
| ------------------- | --------------------------------------------- | ------------------------------------------------- |
| `SSH_PRIVATE_KEY` | Klucz prywatny SSH do połączenia z serwerem | Zawartość pliku `~/.ssh/id_rsa`               |
| `SERVER_HOST`     | Adres IP lub domena serwera                   | `192.168.1.100` lub `staging.twoja-domena.pl` |
| `SERVER_USER`     | Użytkownik SSH na serwerze                   | `deploy` lub `ubuntu`                         |
| `APP_URL`         | URL aplikacji (bez https://)                  | `staging.twoja-domena.pl`                       |

#### Opcjonalne:

| Secret Name       | Description                       | Example                                  |
| ----------------- | --------------------------------- | ---------------------------------------- |
| `SLACK_WEBHOOK` | Webhook URL dla notyfikacji Slack | `https://hooks.slack.com/services/...` |

### 3. Konfiguracja Environment Secrets

Dla różnych środowisk (staging, production) możesz ustawić różne wartości:

1. Przejdź do **Settings → Environments**
2. Utwórz środowiska: `staging` i `production`
3. Dla każdego środowiska ustaw odpowiednie sekrety

#### Przykład dla staging:

- `SERVER_HOST`: `staging.example.com`
- `APP_URL`: `staging.example.com`

#### Przykład dla production:

- `SERVER_HOST`: `example.com`
- `APP_URL`: `example.com`

### 4. Token dla GitHub Container Registry

`GITHUB_TOKEN` jest automatycznie dostępny w workflow i nie wymaga konfiguracji.

### 5. Przygotowanie serwera

Na serwerze docelowym upewnij się że:

1. Docker i Docker Compose są zainstalowane
2. Katalog `/opt/mikrosaas` istnieje i ma odpowiednie uprawnienia
3. Klucz publiczny SSH jest dodany do `~/.ssh/authorized_keys`

```bash
# Na serwerze:
sudo mkdir -p /opt/mikrosaas
sudo chown $USER:$USER /opt/mikrosaas

# Dodaj klucz publiczny
echo "your-public-key" >> ~/.ssh/authorized_keys
```

## Testowanie

Po dodaniu sekretów możesz przetestować deployment używając:

1. **Quick Deploy** (ręczny):

   - Actions → Quick Deploy → Run workflow
   - Wybierz environment (staging/production)
2. **Automatyczny deploy**:

   - Push do brancha `develop` → deploy na staging
   - Push do brancha `main` → deploy na production
