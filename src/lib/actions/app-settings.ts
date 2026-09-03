"use server";
import { generateUUID } from '@/lib/uuid';

import db from "@/lib/db";
import { BusinessMode } from "@prisma/client";

async function getOrCreateSettings() {
  let settings = await db.systemSettings.findFirst();
  if (!settings) {
    settings = await db.systemSettings.create({
      data: {
        id: generateUUID(),
        updatedAt: new Date(),
      },
    });
  }
  return settings;
}

export async function getBusinessMode(): Promise<BusinessMode> {
  const settings = await getOrCreateSettings();
  return settings.businessMode;
}

export async function updateBusinessMode(mode: BusinessMode): Promise<BusinessMode> {
  const settings = await getOrCreateSettings();
  const updated = await db.systemSettings.update({
    where: { id: settings.id },
    data: { businessMode: mode, updatedAt: new Date() },
  });
  return updated.businessMode;
}