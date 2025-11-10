# CI/CD

## Obecny stan:

Aplikacja działa tylko lokalnie, bez publicznego serwera czy domeny.

## Co działa w CI/CD:

### 1. **Testy Backend**

- Budowanie wszystkich mikroserwisów
- Przygotowane miejsce na testy jednostkowe

### 2. **Testy Frontend**

- Instalacja zależności npm
- Linting (sprawdzanie jakości kodu)
- Budowanie aplikacji React

### 3. **Security Scanning**

- Skanowanie Dockerfile'ów pod kątem bezpieczeństwa
- Raportowanie do GitHub Security (jeśli repo publiczne)

### 4. **PR Validation**

- Sprawdzanie formatu commitów (Conventional Commits)
- Szukanie console.log w kodzie
- Walidacja Dockerfile
- **Automatyczne labelowanie PR** (nowa funkcja!)

## Co jest WYŁĄCZONE (bo nie ma serwera):

### 1. **Build Docker Images**

- Niepotrzebne bez serwera do deploymentu

### 2. **Deploy to Staging**

- Brak serwera staging
- Wymaga domeny i serwera VPS/Cloud

### 3. **Deploy to Production**

- Brak serwera produkcyjnego
- Wymaga domeny i serwera VPS/Cloud

### 4. **E2E Tests**

- Wymagają działającego staging
- Playwright testy end-to-end

## Jak aktywować deployment?

### 1. Kup domenę i serwer VPS (mogą być darmowe opcje)

Np. DigitalOcean, AWS EC2, Hetzner

### 2. Odkomentuj w `.github/workflows/ci-cd.yml`:

```yaml
# Zmień z:
if: false  # WYŁĄCZONE
# Na:
if: github.ref == 'refs/heads/main'
```

### 3. Dodaj sekrety w GitHub:

- `SSH_PRIVATE_KEY` - klucz SSH do serwera
- `SERVER_HOST` - IP lub domena
- `SERVER_USER` - użytkownik na serwerze
- `APP_URL` - twoja domena

### 4. Skonfiguruj serwer:

```bash
# Na serwerze:
sudo apt update
sudo apt install docker.io docker-compose
sudo mkdir -p /opt/mikrosaas
```
