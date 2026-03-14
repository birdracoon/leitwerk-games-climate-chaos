namespace Backend.Services;

public class AntiCheatService
{
    private const double MinEfficiency = 0.0;
    private const double MaxEfficiency = 2.0;

    public bool ValidateScore(
        DateTime? gameStartedAt,
        int survivalTimeSeconds,
        double efficiencyQuotient)
    {
        if (gameStartedAt == null) return false;
        var maxSurvival = (int)(DateTime.UtcNow - gameStartedAt.Value).TotalSeconds + 5;
        if (survivalTimeSeconds > maxSurvival || survivalTimeSeconds < 0) return false;
        if (efficiencyQuotient < MinEfficiency || efficiencyQuotient > MaxEfficiency) return false;
        return true;
    }
}
