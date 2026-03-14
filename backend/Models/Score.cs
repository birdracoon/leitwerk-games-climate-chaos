namespace Backend.Models;

public class Score
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string PlayerName { get; set; } = "";
    public int SurvivalTimeSeconds { get; set; }
    public double EfficiencyQuotient { get; set; }
    public int TotalScore { get; set; }
    public DateTime SubmittedAt { get; set; }
}
