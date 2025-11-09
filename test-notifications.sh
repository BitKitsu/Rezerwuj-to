#!/bin/bash

echo "TESTY NOTIFICATION SERVICE"
echo "=============================="
echo ""

# Test 1: Utworzenie powiadomienia
echo "Tworzenie testowego powiadomienia..."
response=$(curl -s -X POST http://localhost:5003/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "title": "Test Powiadomienia",
    "message": "To jest testowe powiadomienie systemu",
    "type": 0,
    "channel": 0
  }')

if [ $? -eq 0 ]; then
    echo "Powiadomienie utworzone"
    notification_id=$(echo $response | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    echo "   ID: $notification_id"
else
    echo "Błąd tworzenia powiadomienia"
fi
echo ""

# Test 2: Przypomnienie o wizycie
echo "Wysyłanie przypomnienia o wizycie..."
curl -s -X POST http://localhost:5003/api/notifications/send-appointment-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "userName": "Jan Kowalski",
    "appointmentId": 1,
    "appointmentDate": "2024-11-10T10:00:00",
    "serviceName": "Strzyżenie męskie",
    "companyAddress": "ul. Główna 123, Warszawa"
  }' > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "Przypomnienie wysłane"
else
    echo "Błąd wysyłania przypomnienia"
fi
echo ""

# Test 3: Pobranie powiadomień
echo "Pobieranie powiadomień użytkownika test-user-123..."
notifications=$(curl -s http://localhost:5003/api/notifications/user/test-user-123)

if [ $? -eq 0 ]; then
    count=$(echo $notifications | grep -o '"id"' | wc -l)
    echo "Znaleziono $count powiadomień"
    echo "$notifications" | python3 -m json.tool 2>/dev/null || echo "$notifications"
else
    echo "Błąd pobierania powiadomień"
fi
echo ""

# Test 4: Health check
echo "Health check..."
health=$(curl -s http://localhost:5003/health)
if [ $? -eq 0 ]; then
    echo "Service healthy: $health"
else
    echo "Service unhealthy"
fi
echo ""

# Test 5: RabbitMQ
echo "Sprawdzanie RabbitMQ..."
rabbitmq_status=$(curl -s -u guest:guest http://localhost:15672/api/overview 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$rabbitmq_status" ]; then
    echo "RabbitMQ Management UI działa"
    echo "   Otwórz: http://localhost:15672 (guest/guest)"
else
    echo "RabbitMQ niedostępne"
fi
echo ""

echo "PODSUMOWANIE:"
echo "================"
echo "• Swagger UI: http://localhost:5003/swagger"
echo "• RabbitMQ: http://localhost:15672"
echo "• Dokumentacja API w Swagger dla pełnej listy endpointów"
