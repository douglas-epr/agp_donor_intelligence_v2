import type { MockSession } from "./types";

// Phase 1 mock session — replaces Supabase Auth in Phase 2.
// Any email/password combo is accepted; this session is returned on "login."
export const mockSession: MockSession = {
  user: {
    id: "mock-user-001",
    email: "demo@agpintelligence.com",
    name: "Demo User",
  },
  isAuthenticated: true,
};

export const unauthenticatedSession: MockSession = {
  user: {
    id: "",
    email: "",
    name: "",
  },
  isAuthenticated: false,
};
