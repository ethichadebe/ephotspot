import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { signUserToken } from '../lib/jwt';
import { generateOtp, saveOtp, verifyOtp } from '../lib/otp';
import type { User } from '@prisma/client';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function loginWithGoogle(idToken: string): Promise<{ token: string; user: User }> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error('Invalid Google token');

  const user = await prisma.user.upsert({
    where: { googleId: payload.sub },
    update: { name: payload.name, email: payload.email },
    create: {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
    },
  });

  return { token: signUserToken(user.id, 'user'), user };
}

export async function loginWithFacebook(accessToken: string): Promise<{ token: string; user: User }> {
  const url = `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Invalid Facebook token');
  const fbUser = (await res.json()) as { id: string; name?: string; email?: string };

  const user = await prisma.user.upsert({
    where: { facebookId: fbUser.id },
    update: { name: fbUser.name, email: fbUser.email },
    create: {
      facebookId: fbUser.id,
      email: fbUser.email,
      name: fbUser.name,
    },
  });

  return { token: signUserToken(user.id, 'user'), user };
}

export async function loginWithApple(identityToken: string): Promise<{ token: string; user: User }> {
  if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_PRIVATE_KEY) {
    // TODO: fill APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY in .env
    // Install 'apple-signin-auth' and replace the decode below with real JWT verification
    throw new Error('Apple Sign-In is not configured on this server');
  }

  // Decode the JWT without verifying (Apple's public key verification is complex;
  // in production use 'apple-signin-auth' library)
  const parts = identityToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid Apple token format');
  const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  const appleId: string = decoded.sub;
  const email: string | undefined = decoded.email;
  if (!appleId) throw new Error('Invalid Apple token: missing sub');

  const user = await prisma.user.upsert({
    where: { appleId },
    update: {},
    create: {
      appleId,
      email,
    },
  });

  return { token: signUserToken(user.id, 'user'), user };
}

export async function requestPhoneOtp(phone: string): Promise<void> {
  const code = generateOtp();
  await saveOtp(phone, code);

  // Send via Africa's Talking — skip if credentials not configured
  if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME });
    await at.SMS.send({
      to: [phone],
      message: `Your EPHotspot verification code is: ${code}`,
      from: process.env.AT_SENDER_ID,
    });
  } else {
    // TODO: fill in AT_API_KEY and AT_USERNAME in .env to enable real SMS
    console.log(`[DEV] OTP for ${phone}: ${code}`);
  }
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<{ token: string; user: User }> {
  const valid = await verifyOtp(phone, code);
  if (!valid) throw new Error('Invalid or expired OTP');

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  return { token: signUserToken(user.id, 'user'), user };
}
