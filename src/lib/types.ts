export interface ArmState {
  base: number;
  shoulder: number;
  elbow: number;
  pickup: number;
}

export interface RecordedStep {
  state: ArmState;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const DEFAULT_ARM_STATE: ArmState = {
  base: 90,
  shoulder: 90,
  elbow: 90,
  pickup: 0 // Default open claw
};
