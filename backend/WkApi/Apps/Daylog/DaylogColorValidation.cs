using System.Text.RegularExpressions;

namespace WkApi.Apps.Daylog;

public static class DaylogColorValidation
{
    private static readonly Regex Hex6 = new(@"^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);

    public static bool IsValidHex6(string? value) =>
        value != null && Hex6.IsMatch(value);

    public static bool IsValidOptionalHex6(string? value) =>
        value == null || Hex6.IsMatch(value);
}
