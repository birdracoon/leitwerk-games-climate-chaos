namespace Backend.Models;

public class Session
{
    public Guid Id { get; set; }
    public string PlayerName { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime? GameStartedAt { get; set; }
    public bool IsActive { get; set; }
}
