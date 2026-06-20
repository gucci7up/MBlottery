import * as QRCode from 'qrcode';

export class QrGenerator {
  static async toDataUrl(ticketId: string): Promise<string> {
    return QRCode.toDataURL(ticketId, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
    });
  }

  static async toBuffer(ticketId: string): Promise<Buffer> {
    return QRCode.toBuffer(ticketId, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
    });
  }
}
