using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddDbContext<GameDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<SessionService>();
builder.Services.AddScoped<ScoreService>();
builder.Services.AddSingleton<AntiCheatService>();

var app = builder.Build();

app.UseCors();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
    db.Database.EnsureCreated();
}

app.MapPost("/api/session", async (CreateSessionRequest req, SessionService svc, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(req.PlayerName) || req.PlayerName.Length > 50)
        return Results.BadRequest(new { error = "Ungültiger Spielername" });
    var session = await svc.CreateSessionAsync(req.PlayerName.Trim(), ct);
    return Results.Ok(new { token = session.Id.ToString(), playerName = session.PlayerName });
});

app.MapPost("/api/game/start", async (StartGameRequest req, SessionService svc, CancellationToken ct) =>
{
    if (!Guid.TryParse(req.Token, out var token))
        return Results.BadRequest(new { error = "Ungültiger Token" });
    var ok = await svc.StartGameAsync(token, ct);
    return ok ? Results.Ok() : Results.BadRequest(new { error = "Spiel konnte nicht gestartet werden" });
});

app.MapPost("/api/score", async (SubmitScoreRequest req, ScoreService svc, CancellationToken ct) =>
{
    if (!Guid.TryParse(req.Token, out var token))
        return Results.BadRequest(new { error = "Ungültiger Token" });
    var (success, error) = await svc.SubmitScoreAsync(
        token, req.SurvivalTimeSeconds, req.EfficiencyQuotient, ct);
    if (!success) return Results.BadRequest(new { error = error ?? "Fehler" });
    return Results.Ok(new { success = true });
});

app.MapGet("/api/leaderboard", async (int? top, ScoreService svc, CancellationToken ct) =>
{
    var limit = Math.Clamp(top ?? 10, 1, 100);
    var scores = await svc.GetLeaderboardAsync(limit, ct);
    return Results.Ok(scores);
});

app.MapPost("/api/admin/clear", (AdminClearRequest req, GameDbContext db, IConfiguration config) =>
{
    var adminKey = config["AdminKey"] ?? "leitwerk-admin-2025";
    if (req.AdminKey != adminKey)
        return Results.Unauthorized();
    db.Scores.RemoveRange(db.Scores);
    db.Sessions.RemoveRange(db.Sessions);
    db.SaveChanges();
    return Results.Ok(new { message = "Daten gelöscht" });
});

app.Run();

record CreateSessionRequest(string PlayerName);
record StartGameRequest(string Token);
record SubmitScoreRequest(string Token, int SurvivalTimeSeconds, double EfficiencyQuotient);
record AdminClearRequest(string AdminKey);
