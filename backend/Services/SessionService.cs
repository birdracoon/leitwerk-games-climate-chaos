using Backend.Data;
using Backend.Models;

namespace Backend.Services;

public class SessionService
{
    private readonly GameDbContext _db;

    public SessionService(GameDbContext db) => _db = db;

    public async Task<Session> CreateSessionAsync(string playerName, CancellationToken ct = default)
    {
        var session = new Session
        {
            Id = Guid.NewGuid(),
            PlayerName = playerName,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync(ct);
        return session;
    }

    public async Task<Session?> GetSessionAsync(Guid id, CancellationToken ct = default)
        => await _db.Sessions.FindAsync([id], ct);

    public async Task<bool> StartGameAsync(Guid sessionId, CancellationToken ct = default)
    {
        var session = await _db.Sessions.FindAsync([sessionId], ct);
        if (session == null || session.GameStartedAt != null) return false;
        session.GameStartedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
