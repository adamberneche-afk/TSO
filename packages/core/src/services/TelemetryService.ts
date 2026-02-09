import crypto from 'crypto';
import { UserProfile } from '@think/types';

export class TelemetryService {
  private hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async trackProfileCreated(profile: UserProfile) {
    if (!profile.metadata.telemetry_opt_in) return;

    const payload = {
      event: 'profile_created',
      timestamp: new Date().toISOString(),
      data: {
        version: profile.version,
        hashed_wallet: this.hashData(profile.wallet_address),
        primary_activity: profile.identity.primary_activity,
        device_id: this.hashData(profile.metadata.device_id),
      }
    };

    this.send(payload);
  }

  private async send(payload: any) {
    try {
      console.log('Telemetry Payload:', payload);
    } catch (error) {
    }
  }
}
