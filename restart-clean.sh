#!/bin/bash

echo "🛑 Zatrzymywanie kontenerów..."
cd app/backend
docker-compose down -v

echo "🗑️ Usuwanie starych obrazów..."
docker rmi backend-identity_api backend-reservation_api 2>/dev/null

echo "🏗️ Budowanie i uruchamianie..."
docker-compose up --build -d

echo "⏳ Czekanie na inicjalizację bazy danych (20 sekund)..."
sleep 20

echo "✅ Sprawdzanie statusu..."
docker-compose ps

echo ""
echo "🧪 Testowanie endpointów:"
echo "----------------------------"
echo "Identity Service:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:5001/swagger/index.html

echo "Reservation Service:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:5002/swagger/index.html

echo ""
echo "📋 Testowanie API:"
echo "----------------------------"
echo "Pobieranie usług:"
curl -s http://localhost:5002/api/services | jq '.' 2>/dev/null || curl -s http://localhost:5002/api/services

echo ""
echo "✨ Gotowe! Sprawdź:"
echo "- http://localhost:5001/swagger - Identity Service"
echo "- http://localhost:5002/swagger - Reservation Service"