export interface R2Config {
    accountId: string;
    accessKey: string;
    secretKey: string;
    bucketName: string;
    publicUrl: string;
}

/**
 * Upload a blob to Cloudflare R2 using a presigned URL from the server.
 * This keeps R2 credentials on the server and simplifies CORS.
 */
export const uploadToR2 = async (blob: Blob, fileName: string, config: R2Config): Promise<string> => {
    const contentType = blob.type || "video/mp4";

    console.log(`Requesting presigned URL for "${fileName}" (${contentType})...`);

    // Step 1: Get presigned URL from our API
    const presignResponse = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileName, contentType }),
    });

    if (!presignResponse.ok) {
        const errorData = await presignResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get presigned URL: ${presignResponse.status}`);
    }

    const { presignedUrl, objectUrl } = await presignResponse.json();

    console.log(`Uploading to presigned URL...`);

    // Step 2: Upload directly to R2 using the presigned URL
    const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
    });

    if (!uploadResponse.ok) {
        throw new Error(`R2 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    console.log("R2 Upload successful. Final URL:", objectUrl);
    return objectUrl;
};
