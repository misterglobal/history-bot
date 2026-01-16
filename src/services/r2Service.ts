import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface R2Config {
    accountId: string;
    accessKey: string;
    secretKey: string;
    bucketName: string;
    publicUrl: string;
}

/**
 * Upload a blob to Cloudflare R2
 */
export const uploadToR2 = async (blob: Blob, fileName: string, config: R2Config): Promise<string> => {
    if (!config.accountId || !config.accessKey || !config.secretKey || !config.bucketName) {
        throw new Error("Missing R2 configuration in Settings.");
    }

    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: config.accessKey,
            secretAccessKey: config.secretKey,
        },
        forcePathStyle: true, // Often needed for R2 in browser
    });

    console.log(`Starting R2 upload to bucket "${config.bucketName}" as "${fileName}"...`);

    const arrayBuffer = await blob.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);

    const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: fileName,
        Body: body,
        ContentType: blob.type || "video/mp4",
    });

    await s3.send(command);

    // Return the public URL
    let publicUrl = config.publicUrl;
    if (!publicUrl.startsWith('http')) {
        publicUrl = `https://${publicUrl}`;
    }
    const baseUrl = publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`;
    const finalUrl = `${baseUrl}${fileName}`;
    console.log("R2 Upload successful. Final URL:", finalUrl);
    return finalUrl;
};
