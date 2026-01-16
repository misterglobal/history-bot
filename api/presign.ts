import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Vercel Serverless Function to generate a presigned PUT URL for R2.
 * 
 * Expected environment variables:
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET_NAME
 * - R2_PUBLIC_URL (optional, for returning the final public URL)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS for frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
        return res.status(400).json({ error: 'Missing filename or contentType' });
    }

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL || '';

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        return res.status(500).json({ error: 'R2 configuration missing on server' });
    }

    const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        ContentType: contentType,
    });

    try {
        // Generate presigned URL valid for 10 minutes
        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

        // Build the final public URL
        let finalPublicUrl = publicUrl;
        if (finalPublicUrl && !finalPublicUrl.startsWith('http')) {
            finalPublicUrl = `https://${finalPublicUrl}`;
        }
        const baseUrl = finalPublicUrl.endsWith('/') ? finalPublicUrl : `${finalPublicUrl}/`;
        const objectUrl = `${baseUrl}${filename}`;

        return res.status(200).json({
            presignedUrl,
            objectUrl,
        });
    } catch (err: any) {
        console.error('Failed to generate presigned URL:', err);
        return res.status(500).json({ error: err.message || 'Failed to generate presigned URL' });
    }
}
