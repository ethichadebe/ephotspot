import { prisma } from '../lib/prisma';
import type { NotificationTrigger } from '@ephotspot/shared';

const TRIGGER_MESSAGES: Record<NotificationTrigger, { title: string; body: string }> = {
  threshold_20: { title: 'Data warning', body: 'You have 20% of your data remaining.' },
  threshold_10: { title: 'Data warning', body: 'You have only 10% of your data remaining. Top up now!' },
  purchase_confirmed: { title: 'Purchase confirmed', body: 'Your data has been added to your account.' },
  session_start: { title: 'Connected', body: 'You are connected to a EPHotspot hotspot.' },
  session_end: { title: 'Disconnected', body: 'Your EPHotspot session has ended.' },
  data_exhausted: { title: 'Data exhausted', body: 'You have no data remaining. Buy a package to reconnect.' },
};

let firebaseAdmin: typeof import('firebase-admin') | null = null;

function getFirebase() {
  if (firebaseAdmin) return firebaseAdmin;
  if (!process.env.FIREBASE_PROJECT_ID) return null;

  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  firebaseAdmin = admin;
  return admin;
}

export const notificationService = {
  async send(userId: string, trigger: NotificationTrigger): Promise<void> {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (!tokens.length) return;

    const { title, body } = TRIGGER_MESSAGES[trigger];
    const admin = getFirebase();
    if (!admin) {
      // TODO: configure FIREBASE_* env vars to enable real push notifications
      console.log(`[DEV] Push to ${userId}: ${title} — ${body}`);
      return;
    }

    await Promise.allSettled(
      tokens.map((t) =>
        admin.messaging().send({ token: t.token, notification: { title, body } })
      )
    );
  },

  async registerToken(userId: string, token: string): Promise<void> {
    await prisma.pushToken.upsert({
      where: { token },
      update: { userId },
      create: { userId, token },
    });
  },
};
