import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const isConfigured = apiKey && !apiKey.startsWith('YOUR_');

const firebaseConfig = {
  apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only initialize Firebase if real credentials are provided
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isConfigured) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
}

export { auth, isConfigured };

// Keep LocalStorage mock for the database for now, tied to the real Auth UID.
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'student' | null;
  classCode: string | null;
  teacherId: string | null;
  createdAt: any;
}

export interface InteractionCheckpoint {
  id: string;
  timestamp: number;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer';
  questionText: string;
  options?: string[];
  correctAnswer?: string;
}

export interface Material {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  interactions: InteractionCheckpoint[];
  createdAt: any;
}

export interface AnswerRecord {
  interactionId: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer?: string;
  isCorrect?: boolean;
}

export interface StudentResponse {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  teacherId: string;
  materialId: string;
  materialTitle: string;
  answers: AnswerRecord[];
  score: number;
  totalQuestions: number;
  completedAt: any;
}

// Helper for LocalStorage
const getMockData = (key: string) => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setMockData = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// Generates a unique 6-character uppercase alphanumeric code
export function generateClassCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Fetch user profile
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const users = getMockData('users');
  return users.find((u: any) => u.uid === uid) || null;
}

// Register user profile
export async function createUserProfile(
  user: { uid: string; email: string | null; displayName: string | null },
  role: 'teacher' | 'student',
  classCodeOrJoinCode: string | null
): Promise<UserProfile> {
  let finalClassCode: string | null = null;
  let finalTeacherId: string | null = null;
  const users = getMockData('users');

  if (role === 'teacher') {
    finalClassCode = generateClassCode();
  } else if (role === 'student') {
    if (!classCodeOrJoinCode) {
      throw new Error('Class code is required for students');
    }
    const teacherDoc = users.find((u: any) => u.role === 'teacher' && u.classCode === classCodeOrJoinCode.toUpperCase());
    if (!teacherDoc) {
      throw new Error('Invalid Class Code. No teacher found with this code.');
    }
    finalTeacherId = teacherDoc.uid;
    finalClassCode = classCodeOrJoinCode.toUpperCase();
  }

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'Anonymous',
    role,
    classCode: finalClassCode,
    teacherId: finalTeacherId,
    createdAt: Date.now(),
  };

  const existingIndex = users.findIndex((u: any) => u.uid === user.uid);
  if (existingIndex > -1) {
    users[existingIndex] = profile;
  } else {
    users.push(profile);
  }
  setMockData('users', users);
  
  return profile;
}

// Create new learning material
export async function createMaterial(
  teacherId: string,
  materialData: Omit<Material, 'id' | 'teacherId' | 'createdAt'>
): Promise<string> {
  const materials = getMockData('materials');
  const newId = 'mat_' + Math.random().toString(36).substr(2, 9);
  
  const newMaterial: Material = {
    ...materialData,
    id: newId,
    teacherId,
    createdAt: Date.now(),
  };
  
  materials.push(newMaterial);
  setMockData('materials', materials);
  return newId;
}

// Fetch materials for a teacher
export async function getTeacherMaterials(teacherId: string): Promise<Material[]> {
  const materials = getMockData('materials');
  return materials.filter((m: any) => m.teacherId === teacherId).sort((a: any, b: any) => b.createdAt - a.createdAt);
}

// Fetch materials for a student (using teacher's ID)
export async function getStudentMaterials(teacherId: string): Promise<Material[]> {
  return getTeacherMaterials(teacherId);
}

// Fetch a single material by ID
export async function getMaterial(materialId: string): Promise<Material | null> {
  const materials = getMockData('materials');
  return materials.find((m: any) => m.id === materialId) || null;
}

// Submit answers
export async function submitStudentResponse(
  studentProfile: UserProfile,
  material: Material,
  answers: AnswerRecord[]
): Promise<string> {
  let score = 0;
  let totalQuestions = 0;

  answers.forEach((ans) => {
    if (ans.correctAnswer !== undefined) {
      totalQuestions++;
      if (ans.studentAnswer.trim().toLowerCase() === ans.correctAnswer.trim().toLowerCase()) {
        ans.isCorrect = true;
        score++;
      } else {
        ans.isCorrect = false;
      }
    } else {
      ans.isCorrect = undefined;
    }
  });

  const responses = getMockData('studentResponses');
  const newId = 'resp_' + Math.random().toString(36).substr(2, 9);

  const responseDoc: StudentResponse = {
    id: newId,
    studentId: studentProfile.uid,
    studentName: studentProfile.displayName,
    studentEmail: studentProfile.email,
    teacherId: studentProfile.teacherId || '',
    materialId: material.id,
    materialTitle: material.title,
    answers,
    score,
    totalQuestions,
    completedAt: Date.now(),
  };

  responses.push(responseDoc);
  setMockData('studentResponses', responses);
  
  return newId;
}

// Fetch results for teacher
export async function getTeacherStudentResponses(teacherId: string): Promise<StudentResponse[]> {
  const responses = getMockData('studentResponses');
  return responses.filter((r: any) => r.teacherId === teacherId).sort((a: any, b: any) => b.completedAt - a.completedAt);
}
