/**
 * Shared test utilities — mock factories for storage, profiles, and content.
 */
import { vi } from "vitest";
import type { IStorage } from "./storage";
import type { Profile, H5pContent } from "@shared/schema";

/** Create a mock Profile with sensible defaults. Override any field. */
export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    email: "test@example.com",
    password: "$2a$10$hashedpassword",
    fullName: "Test User",
    role: "teacher",
    institution: null,
    authProvider: "email",
    googleId: null,
    microsoftId: null,
    googleAccessToken: null,
    googleRefreshToken: null,
    googleTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  } as Profile;
}

/** Create a mock H5pContent with sensible defaults. Override any field. */
export function makeContent(overrides: Partial<H5pContent> = {}): H5pContent {
  return {
    id: "content-1",
    title: "Test Content",
    description: "A test",
    type: "quiz",
    data: { questions: [] },
    userId: "user-1",
    isPublished: false,
    isPublic: false,
    tags: null,
    subject: null,
    gradeLevel: null,
    ageRange: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-06-15"),
    ...overrides,
  } as H5pContent;
}

/** Create a fully-mocked IStorage where every method is a vi.fn(). */
export function mockStorage(): IStorage {
  return {
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    getProfileById: vi.fn(),
    getProfileByEmail: vi.fn(),
    setPasswordResetToken: vi.fn(),
    getProfileByResetToken: vi.fn(),
    clearPasswordResetToken: vi.fn(),
    createContent: vi.fn(),
    updateContent: vi.fn(),
    deleteContent: vi.fn(),
    getContentById: vi.fn(),
    getContentByUserId: vi.fn(),
    getPublishedContent: vi.fn(),
    getPublicContent: vi.fn(),
    copyContent: vi.fn(),
    createShare: vi.fn(),
    getSharesByContentId: vi.fn(),
    upsertLearnerProgress: vi.fn(),
    getLearnerProgress: vi.fn(),
    getUserProgressByContentId: vi.fn(),
    getAllUserProgress: vi.fn(),
    createQuizAttempt: vi.fn(),
    getQuizAttempts: vi.fn(),
    createInteractionEvent: vi.fn(),
    getInteractionEvents: vi.fn(),
    getContentAnalytics: vi.fn(),
    getUserContentAnalytics: vi.fn(),
    getContentLearners: vi.fn(),
    getQuestionAnalytics: vi.fn(),
    getStudentPerformanceDistribution: vi.fn(),
    getScoreDistribution: vi.fn(),
    getAllQuizAttemptsForContent: vi.fn(),
    createChatMessage: vi.fn(),
    getChatHistory: vi.fn(),
    deleteChatHistory: vi.fn(),
    createClass: vi.fn(),
    updateClass: vi.fn(),
    deleteClass: vi.fn(),
    getClassById: vi.fn(),
    getClassesByUserId: vi.fn(),
    createClassEnrollment: vi.fn(),
    deleteClassEnrollment: vi.fn(),
    getClassEnrollments: vi.fn(),
    getStudentClasses: vi.fn(),
    bulkCreateEnrollments: vi.fn(),
    createContentAssignment: vi.fn(),
    deleteContentAssignment: vi.fn(),
    getContentAssignments: vi.fn(),
    getClassAssignments: vi.fn(),
    getStudentAssignments: vi.fn(),
  };
}
