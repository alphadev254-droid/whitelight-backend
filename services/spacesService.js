const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

class SpacesService {
  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.DO_SPACES_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET
      }
    });
    this.bucketName = process.env.DO_SPACES_BUCKET;
  }

  async uploadFile(file, folder = 'products') {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimetype
    });

    try {
      await this.s3Client.send(command);
      // Use CDN URL if available, otherwise use direct endpoint URL
      const baseUrl = process.env.DO_SPACES_CDN_URL || `${process.env.DO_SPACES_ENDPOINT}/${this.bucketName}`;
      const url = `${baseUrl}/${fileName}`;
      return {
        success: true,
        url,
        key: fileName
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    try {
      await this.s3Client.send(command);
      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SpacesService();