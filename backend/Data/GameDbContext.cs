using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data;

public class GameDbContext : DbContext
{
    public GameDbContext(DbContextOptions<GameDbContext> options) : base(options) { }

    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Score> Scores => Set<Score>();
}
