import crypto from 'crypto';
import { prisma } from './prisma';

const OTP_EXPIRY_MINUTES = 10;

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function saveOtp(phone: string, code: string): Promise<void> {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await prisma.otpCode.create({ data: { phone, code, expiresAt } });
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({
    where: {
      phone,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return false;

  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
  return true;
}
