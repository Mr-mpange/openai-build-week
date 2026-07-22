import { api } from "@/lib/api";

export const authService = {
  async login(email: string, password: string) {
    return api.login(email, password);
  },
  async requestReset(email: string) {
    return { ok: true as const, message: `Reset link sent to ${email}` };
  },
};

export const aiService = {
  async *stream(prompt: string): AsyncGenerator<string> {
    const res = await api.aiChat(prompt);
    if (!res.ok) {
      yield res.error;
      return;
    }
    const parts = res.text.split(/(\s+)/);
    for (const p of parts) {
      await new Promise((resolve) => setTimeout(resolve, 18 + Math.random() * 20));
      yield p;
    }
  },
  async transcribe() {
    const res = await api.aiTranscribe();
    if (!res.ok) throw new Error(res.error);
    return res;
  },
};
