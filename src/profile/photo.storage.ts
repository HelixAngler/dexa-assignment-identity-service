import { Injectable } from '@nestjs/common';
import { Client } from 'minio';
import type { Readable } from 'node:stream';
import { minioSettings, type MinioSettings } from '../config';

/** One object as storage hands it back: its bytes and the type they carry. */
export interface StoredObject {
  contentType: string;
  stream: Readable;
}

/**
 * The single gateway to photo storage.
 *
 * The browser PUTs the file itself through a short-lived URL signed here,
 * reads come back as a stream, and replaced objects are cleaned up by this
 * class too. Keeping the client in one place means credentials, endpoint and
 * bucket are resolved once per process while callers only ever handle keys and
 * streams — and no other module has to know which object store is behind them.
 */
@Injectable()
export class PhotoStorage {
  private readonly settings: MinioSettings;
  private readonly client: Client;

  constructor() {
    this.settings = minioSettings();
    this.client = new Client({
      endPoint: this.settings.endpoint,
      port: this.settings.port,
      useSSL: this.settings.useSSL,
      accessKey: this.settings.accessKey,
      secretKey: this.settings.secretKey,
    });
  }

  /** Creates the bucket on first use so an empty store is not an outage. */
  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.settings.bucket);
    if (!exists) {
      await this.client.makeBucket(this.settings.bucket);
    }
  }

  /**
   * URL that authorises a single PUT of one key for a short window. Validation
   * happens before this is ever called, and the bytes go straight to the store,
   * so this service never carries photo payloads in memory.
   */
  async presignPut(
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<string> {
    return this.client.presignedPutObject(
      this.settings.bucket,
      objectKey,
      expiresInSeconds,
    );
  }

  /**
   * Whether an object is really stored. A key can look perfectly valid and
   * still never have been uploaded — a cancelled or failed PUT leaves exactly
   * that state behind.
   */
  async exists(objectKey: string): Promise<boolean> {
    try {
      await this.client.statObject(this.settings.bucket, objectKey);
      return true;
    } catch {
      return false;
    }
  }

  /** Streams an object with the type it was stored under, or null if absent. */
  async open(objectKey: string): Promise<StoredObject | null> {
    try {
      const stat = await this.client.statObject(
        this.settings.bucket,
        objectKey,
      );
      const stream = await this.client.getObject(
        this.settings.bucket,
        objectKey,
      );
      // The store reports the original upload type among the object's
      // metadata; anything stored without one still needs a usable header.
      const stored = stat.metaData['content-type'];
      const contentType =
        typeof stored === 'string' && stored !== ''
          ? stored
          : 'application/octet-stream';
      return { contentType, stream };
    } catch {
      return null;
    }
  }

  /**
   * Removes an object that a newer upload has replaced. Cleanup is best effort:
   * an object that is already gone is the outcome we wanted, and a store that
   * is briefly unavailable must not undo a profile change that has committed.
   */
  async remove(objectKey: string): Promise<void> {
    try {
      await this.client.removeObject(this.settings.bucket, objectKey);
    } catch {
      // Nothing left to clean up, or cleanup can be retried with the next change.
    }
  }
}
