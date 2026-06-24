import { Timestamp, WriteBatch } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { NotificationType } from "@/types";

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  projectId: string;
  applicationId?: string;
  actorName?: string;
}

export function buildNotificationDoc(payload: NotificationPayload) {
  return {
    userId: payload.userId,
    type: payload.type,
    projectId: payload.projectId,
    applicationId: payload.applicationId ?? null,
    actorName: payload.actorName ?? null,
    read: false,
    createdAt: Timestamp.now(),
  };
}

// batch에 알림 write를 추가 (원자적 처리를 위해 batch를 받음)
export function addNotificationToBatch(
  batch: WriteBatch,
  payload: NotificationPayload
) {
  const ref = adminDb.collection("notifications").doc();
  batch.set(ref, buildNotificationDoc(payload));
}

// 단일 알림 즉시 생성 (batch 없이)
export async function createNotification(payload: NotificationPayload) {
  await adminDb.collection("notifications").add(buildNotificationDoc(payload));
}
