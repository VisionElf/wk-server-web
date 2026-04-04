using System.Net;
using System.Net.Http;
using System.Text.RegularExpressions;
using AngleSharp.Dom;
using WkApi.Apps.FutureMatches;

namespace WkApi.Apps.FutureMatches.Crawler.Liquipedia;

public sealed class LiquipediaWikiVisualsExtractor
{
    private static readonly Regex CssBackgroundImageUrl = new(
        @"background-image\s*:\s*url\s*\(\s*(['""]?)(?<u>[^'"")]+)\1\s*\)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromMilliseconds(500));

    private static readonly Regex CssBackgroundImageUrlLoose = new(
        @"url\s*\(\s*(['""]?)(?<u>[^'"")]+)\1\s*\)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromMilliseconds(500));

    private readonly HttpClient _http;
    private readonly ILogger<FutureMatchesCrawlService> _logger;

    public LiquipediaWikiVisualsExtractor(
        HttpClient http,
        ILogger<FutureMatchesCrawlService> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<(string? LogoSrc, string? BannerSrc)> ExtractWikiMainPageVisualsAsync(
        IDocument doc,
        string mainPageUrl,
        CancellationToken ct)
    {
        string? logo = null;
        var logoScope = doc.QuerySelector(".header-banner__logo .logo--dark-theme")
            ?? doc.QuerySelector(".header-banner__logo .logo--light-theme")
            ?? doc.QuerySelector(".header-banner__logo");
        var logoImg = logoScope?.QuerySelector("img")
            ?? doc.QuerySelector(".header-banner__logo img")
            ?? doc.QuerySelector("#brand-logo.brand-logo")
            ?? doc.QuerySelector(".main-nav a.navbar-brand img")
            ?? doc.QuerySelector("nav.main-nav .navbar-brand img");
        if (logoImg != null) {
            logo = logoImg.GetAttribute("src")
                ?? logoImg.GetAttribute("data-src")
                ?? logoImg.GetAttribute("data-lazy-src");
        }

        string? banner = null;
        foreach (var el in doc.QuerySelectorAll(".header-banner, [class*='header-banner']")) {
            banner = TryExtractBackgroundImageFromStyle(DecodeHtmlAttr(el.GetAttribute("style")));
            if (!string.IsNullOrWhiteSpace(banner)) {
                break;
            }
        }

        if (string.IsNullOrWhiteSpace(banner)) {
            banner = TryExtractBannerUrlFromEmbeddedStyleTags(doc);
        }

        if (string.IsNullOrWhiteSpace(banner)) {
            banner = await TryExtractBannerUrlFromLinkedStylesheetsAsync(doc, mainPageUrl, ct).ConfigureAwait(false);
        }

        if (string.IsNullOrWhiteSpace(banner)) {
            foreach (var el in doc.QuerySelectorAll(
                         "[style*='background-image'],[style*='Background-Image'],[style*='background:'],[style*='Background:']")) {
                banner = TryExtractBackgroundImageFromStyle(DecodeHtmlAttr(el.GetAttribute("style")));
                if (!string.IsNullOrWhiteSpace(banner)) {
                    break;
                }
            }
        }

        if (string.IsNullOrWhiteSpace(banner)) {
            banner = TryExtractOgImageBanner(doc);
        }

        if (string.IsNullOrWhiteSpace(banner) && !string.IsNullOrWhiteSpace(logo)) {
            banner = logo;
        }

        return (logo, banner);
    }

    private async Task<string?> TryExtractBannerUrlFromLinkedStylesheetsAsync(
        IDocument doc,
        string mainPageUrl,
        CancellationToken ct)
    {
        const int maxChars = 512_000;
        const int maxSheets = 12;
        Uri pageUri;
        try {
            pageUri = new Uri(mainPageUrl);
        }
        catch {
            return null;
        }

        var seen = new HashSet<string>(StringComparer.Ordinal);
        var fetches = 0;
        foreach (var link in doc.QuerySelectorAll("link[rel=\"stylesheet\"],link[rel='stylesheet']")) {
            if (fetches >= maxSheets) {
                break;
            }

            var href = link.GetAttribute("href");
            if (string.IsNullOrWhiteSpace(href)) {
                continue;
            }

            string abs;
            try {
                abs = new Uri(pageUri, href).AbsoluteUri;
            }
            catch {
                continue;
            }

            if (!seen.Add(abs)) {
                continue;
            }

            if (!abs.StartsWith("https://liquipedia.net", StringComparison.OrdinalIgnoreCase)) {
                continue;
            }

            fetches++;
            try {
                using var resp = await _http.GetAsync(abs, HttpCompletionOption.ResponseHeadersRead, ct)
                    .ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode) {
                    continue;
                }

                var len = resp.Content.Headers.ContentLength;
                if (len is > maxChars) {
                    continue;
                }

                var css = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                if (css.Length > maxChars) {
                    continue;
                }

                var url = ExtractBannerUrlFromCssText(css);
                if (!string.IsNullOrWhiteSpace(url)) {
                    _logger.LogDebug("Banner url from stylesheet {Url}", abs);
                    return url;
                }
            }
            catch (Exception ex) {
                _logger.LogDebug(ex, "Skipped stylesheet fetch {Url}", abs);
            }
        }

        return null;
    }

    private static string? TryExtractBannerUrlFromEmbeddedStyleTags(IDocument doc)
    {
        foreach (var style in doc.QuerySelectorAll("style")) {
            var text = style.TextContent;
            if (string.IsNullOrWhiteSpace(text)) {
                continue;
            }

            var url = ExtractBannerUrlFromCssText(text);
            if (!string.IsNullOrWhiteSpace(url)) {
                return url;
            }
        }

        return null;
    }

    private static string? ExtractBannerUrlFromCssText(string css)
    {
        if (string.IsNullOrWhiteSpace(css)) {
            return null;
        }

        const string marker = ".header-banner";
        var idx = 0;
        while (idx < css.Length) {
            var hit = css.IndexOf(marker, idx, StringComparison.OrdinalIgnoreCase);
            if (hit < 0) {
                return null;
            }

            var after = hit + marker.Length;
            if (after < css.Length && css[after] == '_') {
                idx = hit + 1;
                continue;
            }

            var open = FindCssDeclarationBlockOpen(css, hit);
            if (open < 0) {
                idx = hit + 1;
                continue;
            }

            var close = MatchingCloseCssBrace(css, open);
            if (close < 0) {
                idx = hit + 1;
                continue;
            }

            var block = css.Substring(open + 1, close - open - 1);
            var url = PickBestBannerUrlFromCssDeclarationBlock(block);
            if (!string.IsNullOrWhiteSpace(url)) {
                return url;
            }

            idx = close + 1;
        }

        return null;
    }

    private static string? PickBestBannerUrlFromCssDeclarationBlock(string block)
    {
        string? last = null;
        foreach (Match loose in CssBackgroundImageUrlLoose.Matches(block)) {
            if (!loose.Success) {
                continue;
            }

            var u = NormalizeCssUrlToken(loose.Groups["u"].Value.Trim());
            if (string.IsNullOrEmpty(u)
                || u.StartsWith("data:", StringComparison.OrdinalIgnoreCase)
                || u.Contains("linear-gradient", StringComparison.OrdinalIgnoreCase)) {
                continue;
            }

            last = u;
        }

        return last;
    }

    private static int FindCssDeclarationBlockOpen(string css, int hit)
    {
        var j = hit;
        while (j < css.Length && css[j] != '{') {
            if (css[j] == '/' && j + 1 < css.Length && css[j + 1] == '*') {
                j += 2;
                while (j + 1 < css.Length && !(css[j] == '*' && css[j + 1] == '/')) {
                    j++;
                }

                j = Math.Min(j + 2, css.Length);
                continue;
            }

            if (css[j] is '"' or '\'') {
                var q = css[j];
                j++;
                while (j < css.Length) {
                    if (css[j] == '\\' && j + 1 < css.Length) {
                        j += 2;
                        continue;
                    }

                    if (css[j] == q) {
                        j++;
                        break;
                    }

                    j++;
                }

                continue;
            }

            j++;
        }

        return j < css.Length ? j : -1;
    }

    private static int MatchingCloseCssBrace(string css, int openBraceIndex)
    {
        var depth = 1;
        var i = openBraceIndex + 1;
        while (i < css.Length && depth > 0) {
            var c = css[i];
            if (c == '/' && i + 1 < css.Length && css[i + 1] == '*') {
                i += 2;
                while (i + 1 < css.Length && !(css[i] == '*' && css[i + 1] == '/')) {
                    i++;
                }

                i = Math.Min(i + 2, css.Length);
                continue;
            }

            if (c is '"' or '\'') {
                var q = c;
                i++;
                while (i < css.Length) {
                    if (css[i] == '\\' && i + 1 < css.Length) {
                        i += 2;
                        continue;
                    }

                    if (css[i] == q) {
                        i++;
                        break;
                    }

                    i++;
                }

                continue;
            }

            if (c == '{') {
                depth++;
            }
            else if (c == '}') {
                depth--;
            }

            i++;
        }

        return depth == 0 ? i - 1 : -1;
    }

    private static string? DecodeHtmlAttr(string? s) =>
        string.IsNullOrEmpty(s) ? s : WebUtility.HtmlDecode(s);

    private static string? TryExtractOgImageBanner(IDocument doc)
    {
        var meta = doc.QuerySelector("meta[property=\"og:image\"]");
        var content = meta?.GetAttribute("content")?.Trim();
        if (string.IsNullOrWhiteSpace(content)) {
            return null;
        }

        var lower = content.ToLowerInvariant();
        if (lower.Contains("facebook-image", StringComparison.Ordinal)
            || lower.Contains("searchengineoptimization", StringComparison.Ordinal)
            || lower.Contains("defaultmetaimage", StringComparison.Ordinal)) {
            return null;
        }

        return content;
    }

    private static string? TryExtractBackgroundImageFromStyle(string? style)
    {
        if (string.IsNullOrWhiteSpace(style)) {
            return null;
        }

        var m = CssBackgroundImageUrl.Match(style);
        if (m.Success) {
            return NormalizeCssUrlToken(m.Groups["u"].Value.Trim());
        }

        foreach (Match loose in CssBackgroundImageUrlLoose.Matches(style)) {
            if (!loose.Success) {
                continue;
            }

            var u = NormalizeCssUrlToken(loose.Groups["u"].Value.Trim());
            if (string.IsNullOrEmpty(u)
                || u.StartsWith("data:", StringComparison.OrdinalIgnoreCase)
                || u.Contains("linear-gradient", StringComparison.OrdinalIgnoreCase)) {
                continue;
            }

            return u;
        }

        return null;
    }

    private static string NormalizeCssUrlToken(string u)
    {
        if (u.Length >= 2
            && ((u[0] == '"' && u[^1] == '"') || (u[0] == '\'' && u[^1] == '\''))) {
            return u[1..^1].Trim();
        }

        return u;
    }
}
