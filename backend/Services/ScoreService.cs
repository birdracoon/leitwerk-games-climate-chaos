using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Services;

public class ScoreService
{
    private readonly GameDbContext _db;
    private readonly AntiCheatService _antiCheat;

    public ScoreService(GameDbContext db, AntiCheatService antiCheat)
    {
        _db = db;
        _antiCheat = antiCheat;
    }

    public async Task<(bool Success, string? Error)> SubmitScoreAsync(
        Guid sessionId,
        int survivalTimeSeconds,
        double efficiencyQuotient,
        CancellationToken ct = default)
    {
        var session = await _db.Sessions.FindAsync([sessionId], ct);
        if (session == null) return (false, "Session nicht gefunden");
        if (!session.IsActive) return (false, "Session nicht aktiv");
        if (await _db.Scores.AnyAsync(s => s.SessionId == sessionId, ct))
            return (false, "Score bereits eingereicht");

        if (!_antiCheat.ValidateScore(session.GameStartedAt, survivalTimeSeconds, efficiencyQuotient))
            return (false, "Score-Validierung fehlgeschlagen");

        var totalScore = (int)(survivalTimeSeconds * efficiencyQuotient);
        var score = new Score
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            PlayerName = session.PlayerName,
            SurvivalTimeSeconds = survivalTimeSeconds,
            EfficiencyQuotient = efficiencyQuotient,
            TotalScore = totalScore,
            SubmittedAt = DateTime.UtcNow
        };
        session.IsActive = false;
        _db.Scores.Add(score);
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }

    public async Task<List<ScoreDto>> GetLeaderboardAsync(int top = 10, CancellationToken ct = default)
    {
        return await _db.Scores
            .OrderByDescending(s => s.TotalScore)
            .Take(top)
            .Select(s => new ScoreDto(
                s.PlayerName,
                s.TotalScore,
                s.SurvivalTimeSeconds,
                s.EfficiencyQuotient))
            .ToListAsync(ct);
    }

    public record ScoreDto(string PlayerName, int TotalScore, int SurvivalTimeSeconds, double EfficiencyQuotient);
}
