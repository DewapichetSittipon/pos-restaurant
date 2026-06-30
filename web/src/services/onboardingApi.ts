import { api } from './api';
import type { PlanView } from '../type/manage';

// สถานะ onboarding ของร้านที่เพิ่งสมัคร (pending)
export interface OnboardingStatus {
  shopStatus: 'pending' | 'active';
  requestedPlanKey: string | null;
  paymentSlipUrl: string | null;
  platformPromptPay: string | null; // PromptPay แพลตฟอร์มสำหรับโอนเงิน (null = ยังไม่ตั้ง)
  plans: PlanView[];
}

export async function fetchOnboarding(): Promise<OnboardingStatus> {
  const { data } = await api.get<OnboardingStatus>('/onboarding');
  return data;
}

// เลือกแพ็กเกจ + อัปสลิป (multipart) — คืนสถานะใหม่
export async function submitOnboarding(
  planKey: string,
  slip: File,
): Promise<OnboardingStatus> {
  const fd = new FormData();
  fd.append('planKey', planKey);
  fd.append('slip', slip);
  const { data } = await api.post<OnboardingStatus>('/onboarding/submit', fd);
  return data;
}
