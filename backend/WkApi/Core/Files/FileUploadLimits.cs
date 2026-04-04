namespace WkApi.Infrastructure.Files;

/// <summary>Shared limits for multipart user uploads (reusable across feature controllers).</summary>
public static class FileUploadLimits
{
    public const long DefaultMaxBytes = 3_145_728;

    public static bool IsWithinMaxSize(long length, long maxBytes = DefaultMaxBytes) =>
        length > 0 && length <= maxBytes;
}
