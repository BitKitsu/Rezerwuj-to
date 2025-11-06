# Faza kompilacji
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["IdentityService.csproj", "."]
RUN dotnet restore "IdentityService.csproj"
COPY . .
RUN dotnet publish "IdentityService.csproj" -c Release -o /app/publish

# Faza uruchomienia
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Użyj zmiennej środowiskowej do konfiguracji portu, domyślnie 8080
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "IdentityService.dll"]