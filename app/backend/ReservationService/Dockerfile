# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["ReservationService.csproj", "."]
RUN dotnet restore "./ReservationService.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "ReservationService.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "ReservationService.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ReservationService.dll"]
