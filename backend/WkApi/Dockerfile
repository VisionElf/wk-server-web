# --- Stage 1: publish the ASP.NET Core API ---
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

COPY . .
RUN dotnet publish -c Release -o /out

# --- Stage 2: runtime image (no SDK) ---
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /out .
# ASP.NET Core listens on port 8080 by default in containers unless ASPNETCORE_URLS is set.
ENTRYPOINT ["dotnet", "WkApi.dll"]
