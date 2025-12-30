using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ReservationService.Migrations
{
    /// <inheritdoc />
    public partial class ReservationInit_20251230 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Phone = table.Column<string>(type: "text", nullable: false),
                    StreetName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StreetNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ApartmentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    City = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Country = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Website = table.Column<string>(type: "text", nullable: true),
                    OpeningHour = table.Column<string>(type: "text", nullable: true),
                    ClosingHour = table.Column<string>(type: "text", nullable: true),
                    RegistrationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EventStores",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    AggregateId = table.Column<string>(type: "text", nullable: false),
                    EventType = table.Column<string>(type: "text", nullable: false),
                    EventData = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: true),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StoredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventStores", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Branches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyId = table.Column<int>(type: "integer", nullable: false),
                    BranchName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StreetName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StreetNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ApartmentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    City = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Country = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    OpeningHour = table.Column<string>(type: "text", nullable: true),
                    ClosingHour = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Branches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Branches_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Services",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServiceName = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Price = table.Column<decimal>(type: "numeric", nullable: false),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    CompanyId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Services", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Services_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Services_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Appointments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DateStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompanyId = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    ServiceId = table.Column<int>(type: "integer", nullable: false),
                    CustomerId = table.Column<string>(type: "text", nullable: false),
                    StaffId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Appointments_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Appointments_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Appointments_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Schedules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyId = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    ServiceId = table.Column<int>(type: "integer", nullable: false),
                    StaffId = table.Column<string>(type: "text", nullable: true),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Schedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Schedules_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Schedules_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Schedules_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BranchReviews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompanyId = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    AppointmentId = table.Column<int>(type: "integer", nullable: false),
                    CustomerId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BranchReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BranchReviews_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BranchReviews_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BranchReviews_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TimeSlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyId = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    ServiceId = table.Column<int>(type: "integer", nullable: false),
                    StaffId = table.Column<string>(type: "text", nullable: true),
                    SlotStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SlotEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    IsBlocked = table.Column<bool>(type: "boolean", nullable: false),
                    AppointmentId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimeSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimeSlots_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TimeSlots_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TimeSlots_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TimeSlots_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Companies",
                columns: new[] { "Id", "ApartmentNumber", "City", "ClosingHour", "CompanyName", "Country", "Description", "Email", "OpeningHour", "Phone", "PostalCode", "RegistrationDate", "StreetName", "StreetNumber", "Website" },
                values: new object[,]
                {
                    { 1, null, "Warszawa", null, "Artistic Studio", "Polska", "Nowoczesny salon fryzjerski z wieloletnim doświadczeniem", "kontakt@artisticstudio.pl", null, "+48123456789", "00-001", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4187), "ul. Główna 15", null, "https://artisticstudio.pl" },
                    { 2, null, "Warszawa", null, "Barber Craft", "Polska", "Męski barber shop z tradycyjnym podejściem do stylizacji", "kontakt@barbercraft.pl", null, "+48222333444", "00-120", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4190), "ul. Męska 10", null, "https://barbercraft.pl" },
                    { 3, null, "Kraków", null, "Beauty Glamour", "Polska", "Profesjonalne studio urody i kosmetyki", "kontakt@beautyglamour.pl", null, "+48333444555", "30-001", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4192), "ul. Piękna 5", null, "https://beautyglamour.pl" },
                    { 4, null, "Kraków", null, "Wellness Spa", "Polska", "Centrum SPA i masażu relaksacyjnego", "info@wellnessspa.pl", null, "+48444555666", "30-045", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4194), "ul. Leśna 8", null, "https://wellnessspa.pl" },
                    { 5, null, "Wrocław", null, "Nails Studio", "Polska", "Profesjonalny salon paznokci i stylizacji dłoni", "kontakt@nailsstudio.pl", null, "+48555666777", "50-001", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4196), "ul. Dłonie 2", null, "https://nailsstudio.pl" },
                    { 6, null, "Poznań", null, "Massage Center", "Polska", "Masaże relaksacyjne i zabiegi lecznicze", "kontakt@massagecenter.pl", null, "+48666777888", "60-001", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4198), "ul. Relaksu 21", null, "https://massagecenter.pl" },
                    { 7, null, "Wrocław", null, "Coffee Barber", "Polska", "Barber shop z kawiarnią w stylu industrialnym", "kontakt@coffeebarber.pl", null, "+48777888999", "50-120", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4200), "ul. Kawowa 7", null, "https://coffeebarber.pl" },
                    { 8, null, "Gdańsk", null, "Prestige Clinic", "Polska", "Zaawansowane zabiegi kosmetologiczne i medycyny estetycznej", "rejestracja@prestigeclinic.pl", null, "+48888999000", "80-001", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4201), "ul. Luksusowa 1", null, "https://prestigeclinic.pl" },
                    { 9, null, "Łódź", null, "City Hair Studio", "Polska", "Nowoczesny salon fryzjerski w centrum miasta", "kontakt@cityhairstudio.pl", null, "+48999000111", "90-001", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4203), "ul. Miejska 11", null, "https://cityhairstudio.pl" },
                    { 11, null, "Rzeszów", null, "Podkarpackie Barber Shop", "Polska", "Tradycyjny barber shop z nowoczesnym podejściem", "kontakt@podkarpackiebarber.pl", null, "+48171234567", "35-001", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4205), "ul. Rzeszowska 14", null, "https://podkarpackiebarber.pl" },
                    { 12, null, "Rzeszów", null, "Beauty Studio Rzeszów", "Polska", "Nowoczesne studio urody z pełną ofertą zabiegów", "info@beautystudiorzeszow.pl", null, "+48172345678", "35-010", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4207), "ul. Piłsudskiego 22", null, "https://beautystudiorzeszow.pl" }
                });

            migrationBuilder.InsertData(
                table: "Branches",
                columns: new[] { "Id", "ApartmentNumber", "BranchName", "City", "ClosingHour", "CompanyId", "Country", "CreatedAt", "OpeningHour", "PostalCode", "StreetName", "StreetNumber" },
                values: new object[,]
                {
                    { 1, null, "Oddział główny", "Warszawa", null, 1, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4485), null, "00-001", "ul. Główna 15", null },
                    { 2, null, "Oddział główny", "Warszawa", null, 2, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4487), null, "00-120", "ul. Męska 10", null },
                    { 3, null, "Oddział główny", "Kraków", null, 3, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4488), null, "30-001", "ul. Piękna 5", null },
                    { 4, null, "Oddział główny", "Kraków", null, 4, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4489), null, "30-045", "ul. Leśna 8", null },
                    { 5, null, "Oddział główny", "Wrocław", null, 5, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4490), null, "50-001", "ul. Dłonie 2", null },
                    { 6, null, "Oddział główny", "Poznań", null, 6, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4492), null, "60-001", "ul. Relaksu 21", null },
                    { 7, null, "Oddział główny", "Wrocław", null, 7, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4493), null, "50-120", "ul. Kawowa 7", null },
                    { 8, null, "Oddział główny", "Gdańsk", null, 8, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4494), null, "80-001", "ul. Luksusowa 1", null },
                    { 9, null, "Oddział główny", "Łódź", null, 9, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4495), null, "90-001", "ul. Miejska 11", null },
                    { 11, null, "Oddział główny", "Rzeszów", null, 11, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4497), null, "35-001", "ul. Rzeszowska 14", null },
                    { 12, null, "Oddział główny", "Rzeszów", null, 12, "Polska", new DateTime(2025, 12, 30, 9, 39, 19, 675, DateTimeKind.Utc).AddTicks(4499), null, "35-010", "ul. Piłsudskiego 22", null }
                });

            migrationBuilder.InsertData(
                table: "Services",
                columns: new[] { "Id", "BranchId", "CompanyId", "Description", "DurationMinutes", "Price", "ServiceName" },
                values: new object[,]
                {
                    { 1, 1, 1, "Klasyczne strzyżenie męskie", 30, 50m, "Strzyżenie męskie" },
                    { 2, 1, 1, "Strzyżenie i modelowanie", 60, 80m, "Strzyżenie damskie" },
                    { 3, 1, 1, "Stylizacja włosów na specjalne okazje", 45, 70m, "Modelowanie włosów" },
                    { 4, 1, 1, "Farbowanie włosów z konsultacją", 120, 200m, "Koloryzacja" },
                    { 5, 1, 1, "Zabieg odbudowujący strukturę włosa", 90, 150m, "Regeneracja włosów" },
                    { 6, 2, 2, "Modelowanie i pielęgnacja brody", 30, 60m, "Strzyżenie brody" },
                    { 7, 2, 2, "Strzyżenie z myciem i stylizacją", 45, 90m, "Strzyżenie męskie premium" },
                    { 8, 2, 2, "Kompleksowa pielęgnacja brody i włosów", 60, 120m, "Pakiet broda + włosy" },
                    { 9, 2, 2, "Tradycyjne golenie brzytwą", 40, 70m, "Golenie brzytwą" },
                    { 10, 2, 2, "Strzyżenie dziecięce", 30, 45m, "Strzyżenie dla chłopców" },
                    { 11, 3, 3, "Manicure z malowaniem paznokci", 60, 80m, "Manicure klasyczny" },
                    { 12, 3, 3, "Pedicure z masażem stóp", 75, 120m, "Pedicure spa" },
                    { 13, 3, 3, "Makijaż na specjalne okazje", 60, 150m, "Makijaż okolicznościowy" },
                    { 14, 3, 3, "Indywidualnie dobrany zabieg pielęgnacyjny", 90, 200m, "Zabieg na twarz" },
                    { 15, 3, 3, "Podkreślenie oprawy oczu", 30, 60m, "Henna brwi i rzęs" },
                    { 16, 4, 4, "Całościowy masaż relaksacyjny", 60, 180m, "Masaż relaksacyjny" },
                    { 17, 4, 4, "Masaż z użyciem gorących kamieni", 75, 220m, "Masaż gorącymi kamieniami" },
                    { 18, 4, 4, "Pakiet sauna i masaż", 90, 250m, "Sauna + masaż" },
                    { 19, 4, 4, "Pakiet spa dla dwóch osób", 120, 400m, "Rytuał spa dla dwojga" },
                    { 20, 4, 4, "Masaż pleców i karku", 45, 120m, "Masaż pleców" },
                    { 21, 5, 5, "Manicure z lakierem hybrydowym", 75, 100m, "Manicure hybrydowy" },
                    { 22, 5, 5, "Uzupełnianie paznokci żelowych", 90, 130m, "Uzupełnianie żelu" },
                    { 23, 5, 5, "Podstawowa pielęgnacja stóp", 60, 90m, "Pedicure klasyczny" },
                    { 24, 5, 5, "Pielęgnacja paznokci japońską metodą", 60, 110m, "Manicure japoński" },
                    { 25, 5, 5, "Artystyczne zdobienia paznokci", 45, 60m, "Zdobienie paznokci" },
                    { 26, 6, 6, "Masaż klasyczny całego ciała", 60, 160m, "Masaż klasyczny" },
                    { 27, 6, 6, "Intensywny masaż dla osób aktywnych", 60, 190m, "Masaż sportowy" },
                    { 28, 6, 6, "Skoncentrowany masaż na odcinku lędźwiowym i szyjnym", 45, 210m, "Masaż leczniczy kręgosłupa" },
                    { 29, 6, 6, "Zabieg wspierający układ limfatyczny", 60, 200m, "Drenaż limfatyczny" },
                    { 30, 6, 6, "Relaksacyjny masaż z użyciem świecy", 75, 220m, "Masaż świecą" },
                    { 31, 7, 7, "Strzyżenie męskie z dowolną kawą w cenie", 45, 85m, "Strzyżenie z kawą" },
                    { 32, 7, 7, "Modelowanie brody z pielęgnacją", 35, 70m, "Stylizacja brody" },
                    { 33, 7, 7, "Strzyżenie, broda oraz kawa speciality", 75, 140m, "Pakiet premium" },
                    { 34, 7, 7, "Szybkie strzyżenie dla zabieganych", 25, 60m, "Strzyżenie ekspres" },
                    { 35, 7, 7, "Mycie i odżywka do włosów", 20, 40m, "Pielęgnacja włosów" },
                    { 36, 8, 8, "Zabieg mezoterapii skóry twarzy", 90, 450m, "Mezoterapia igłowa" },
                    { 37, 8, 8, "Zabieg złuszczający dobrany do typu skóry", 60, 280m, "Peeling chemiczny" },
                    { 38, 8, 8, "Zaawansowany zabieg przeciwstarzeniowy", 75, 400m, "Zabieg anti-aging" },
                    { 39, 8, 8, "Analiza skóry i plan pielęgnacji", 45, 150m, "Konsultacja kosmetologiczna" },
                    { 40, 8, 8, "Nowoczesne oczyszczanie skóry", 70, 320m, "Oczyszczanie wodorowe" },
                    { 41, 9, 9, "Nowoczesne cięcie dopasowane do stylu", 40, 75m, "Strzyżenie miejskie" },
                    { 42, 9, 9, "Rozjaśnianie i koloryzacja techniką balayage", 150, 260m, "Balayage" },
                    { 43, 9, 9, "Wygładzanie włosów keratyną", 180, 350m, "Prostowanie keratynowe" },
                    { 44, 9, 9, "Strzyżenie dla dzieci", 30, 55m, "Strzyżenie dziecięce" },
                    { 45, 9, 9, "Fryzura na wesele lub imprezę", 90, 190m, "Upięcie okolicznościowe" },
                    { 51, 11, 11, "Tradycyjne strzyżenie męskie z precyzją", 30, 55m, "Strzyżenie męskie klasyczne" },
                    { 52, 11, 11, "Modelowanie i stylizacja brody", 25, 65m, "Strzyżenie brody" },
                    { 53, 11, 11, "Klasyczne golenie z gorącym ręcznikiem", 40, 75m, "Golenie brzytwą tradycyjne" },
                    { 54, 11, 11, "Kompleksowa pielęgnacja brody", 60, 120m, "Pakiet premium broda" },
                    { 55, 11, 11, "Nowoczesne strzyżenie dla młodych mężczyzn", 25, 45m, "Strzyżenie młodzieżowe" },
                    { 56, 12, 12, "Profesjonalne strzyżenie z modelowaniem", 60, 85m, "Strzyżenie damskie" },
                    { 57, 12, 12, "Farbowanie z konsultacją kolorystyczną", 120, 220m, "Koloryzacja włosów" },
                    { 58, 12, 12, "Relaksacyjny masaż skóry głowy", 30, 60m, "Masaż głowy" },
                    { 59, 12, 12, "Intensywna regeneracja włosów", 90, 160m, "Zabieg regenerujący" },
                    { 60, 12, 12, "Elegancka fryzura ślubna", 120, 280m, "Upięcie ślubne" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_BranchId",
                table: "Appointments",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_CompanyId",
                table: "Appointments",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_ServiceId",
                table: "Appointments",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_CompanyId_BranchName",
                table: "Branches",
                columns: new[] { "CompanyId", "BranchName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BranchReviews_AppointmentId",
                table: "BranchReviews",
                column: "AppointmentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BranchReviews_BranchId",
                table: "BranchReviews",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_BranchReviews_CompanyId_BranchId_CreatedAt",
                table: "BranchReviews",
                columns: new[] { "CompanyId", "BranchId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_EventStores_AggregateId",
                table: "EventStores",
                column: "AggregateId");

            migrationBuilder.CreateIndex(
                name: "IX_EventStores_EventId",
                table: "EventStores",
                column: "EventId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EventStores_OccurredAt",
                table: "EventStores",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_Schedules_BranchId",
                table: "Schedules",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Schedules_CompanyId_BranchId_ServiceId_DayOfWeek",
                table: "Schedules",
                columns: new[] { "CompanyId", "BranchId", "ServiceId", "DayOfWeek" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Schedules_ServiceId",
                table: "Schedules",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Services_BranchId",
                table: "Services",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Services_CompanyId",
                table: "Services",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_AppointmentId",
                table: "TimeSlots",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_BranchId",
                table: "TimeSlots",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_CompanyId_BranchId_SlotStart_SlotEnd",
                table: "TimeSlots",
                columns: new[] { "CompanyId", "BranchId", "SlotStart", "SlotEnd" });

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_ServiceId",
                table: "TimeSlots",
                column: "ServiceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BranchReviews");

            migrationBuilder.DropTable(
                name: "EventStores");

            migrationBuilder.DropTable(
                name: "Schedules");

            migrationBuilder.DropTable(
                name: "TimeSlots");

            migrationBuilder.DropTable(
                name: "Appointments");

            migrationBuilder.DropTable(
                name: "Services");

            migrationBuilder.DropTable(
                name: "Branches");

            migrationBuilder.DropTable(
                name: "Companies");
        }
    }
}
