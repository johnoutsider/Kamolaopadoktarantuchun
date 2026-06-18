import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';

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
let db: Firestore | null = null;

if (isConfigured) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db, isConfigured };

// ─── Data Interfaces ───────────────────────────────────────────────────────────

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

// ─── LocalStorage Fallback Helpers ────────────────────────────────────────────

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

// Strips undefined values from objects so Firestore doesn't reject them
function stripUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined);
  }
  if (obj !== null && typeof obj === 'object') {
    const clean: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        clean[key] = stripUndefined(obj[key]);
      }
    }
    return clean;
  }
  return obj;
}

// Generates a unique 6-character uppercase alphanumeric code
export function generateClassCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ─── User Profile Functions ───────────────────────────────────────────────────

// Fetch user profile — tries Firestore first, falls back to localStorage
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (db) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      console.warn('Firestore unavailable, falling back to localStorage:', err);
    }
  }
  // localStorage fallback
  const users = getMockData('users');
  return users.find((u: any) => u.uid === uid) || null;
}

// Register user profile — tries Firestore first, falls back to localStorage
export async function createUserProfile(
  user: { uid: string; email: string | null; displayName: string | null },
  role: 'teacher' | 'student',
  classCodeOrJoinCode: string | null
): Promise<UserProfile> {
  let finalClassCode: string | null = null;
  let finalTeacherId: string | null = null;

  if (role === 'teacher') {
    finalClassCode = generateClassCode();
  } else if (role === 'student') {
    if (!classCodeOrJoinCode) {
      throw new Error('Class code is required for students');
    }
    const code = classCodeOrJoinCode.toUpperCase();

    // Try Firestore lookup first
    if (db) {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'teacher'),
          where('classCode', '==', code)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          throw new Error('Invalid Class Code. No teacher found with this code.');
        }
        const teacherDoc = snap.docs[0].data() as UserProfile;
        finalTeacherId = teacherDoc.uid;
        finalClassCode = code;
      } catch (err: any) {
        if (err.message.startsWith('Invalid Class Code')) throw err;
        // Firestore error (permissions, not enabled) — fall back to localStorage
        console.warn('Firestore lookup failed, using localStorage:', err);
        const users = getMockData('users');
        const teacherDoc = users.find(
          (u: any) => u.role === 'teacher' && u.classCode === code
        );
        if (!teacherDoc) {
          throw new Error('Invalid Class Code. No teacher found with this code.');
        }
        finalTeacherId = teacherDoc.uid;
        finalClassCode = code;
      }
    } else {
      // No Firestore — localStorage only
      const users = getMockData('users');
      const teacherDoc = users.find(
        (u: any) => u.role === 'teacher' && u.classCode === code
      );
      if (!teacherDoc) {
        throw new Error('Invalid Class Code. No teacher found with this code.');
      }
      finalTeacherId = teacherDoc.uid;
      finalClassCode = code;
    }
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

  // Save to Firestore
  if (db) {
    try {
      await setDoc(doc(db, 'users', user.uid), stripUndefined(profile));
      return profile;
    } catch (err) {
      console.warn('Firestore write failed, saving to localStorage:', err);
    }
  }

  // localStorage fallback
  const users = getMockData('users');
  const existingIndex = users.findIndex((u: any) => u.uid === user.uid);
  if (existingIndex > -1) {
    users[existingIndex] = profile;
  } else {
    users.push(profile);
  }
  setMockData('users', users);

  return profile;
}

// ─── Materials Functions ───────────────────────────────────────────────────────

// Create new learning material
export async function createMaterial(
  teacherId: string,
  materialData: Omit<Material, 'id' | 'teacherId' | 'createdAt'>
): Promise<string> {
  const newMaterial = {
    ...materialData,
    teacherId,
    createdAt: Date.now(),
  };

  if (db) {
    try {
      const docRef = await addDoc(collection(db, 'materials'), stripUndefined(newMaterial));
      return docRef.id;
    } catch (err: any) {
      console.error('Firestore write failed:', err?.message || err);
      throw new Error('Failed to save material: ' + (err?.message || 'Firestore error. Check your Firestore rules.'));
    }
  }

  // localStorage fallback
  const materials = getMockData('materials');
  const newId = 'mat_' + Math.random().toString(36).substr(2, 9);
  materials.push({ ...newMaterial, id: newId });
  setMockData('materials', materials);
  return newId;
}

// Fetch materials for a teacher
export async function getTeacherMaterials(teacherId: string): Promise<Material[]> {
  if (db) {
    try {
      const q = query(
        collection(db, 'materials'),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Material));
    } catch (err) {
      console.warn('Firestore read failed, using localStorage:', err);
    }
  }
  const materials = getMockData('materials');
  return materials
    .filter((m: any) => m.teacherId === teacherId)
    .sort((a: any, b: any) => b.createdAt - a.createdAt);
}

// Fetch materials for a student (using teacher's ID)
export async function getStudentMaterials(teacherId: string): Promise<Material[]> {
  return getTeacherMaterials(teacherId);
}

// Fetch a single material by ID
export async function getMaterial(materialId: string): Promise<Material | null> {
  if (db) {
    try {
      const docRef = doc(db, 'materials', materialId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Material;
      }
      return null;
    } catch (err) {
      console.warn('Firestore read failed, using localStorage:', err);
    }
  }
  const materials = getMockData('materials');
  return materials.find((m: any) => m.id === materialId) || null;
}

// ─── Student Response Functions ────────────────────────────────────────────────

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

  const responseDoc: Omit<StudentResponse, 'id'> = {
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

  if (db) {
    try {
      const docRef = await addDoc(collection(db, 'studentResponses'), stripUndefined(responseDoc));
      return docRef.id;
    } catch (err) {
      console.warn('Firestore write failed, saving to localStorage:', err);
    }
  }

  // localStorage fallback
  const responses = getMockData('studentResponses');
  const newId = 'resp_' + Math.random().toString(36).substr(2, 9);
  responses.push({ ...responseDoc, id: newId });
  setMockData('studentResponses', responses);
  return newId;
}

// Fetch results for teacher
export async function getTeacherStudentResponses(teacherId: string): Promise<StudentResponse[]> {
  if (db) {
    try {
      const q = query(
        collection(db, 'studentResponses'),
        where('teacherId', '==', teacherId),
        orderBy('completedAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentResponse));
    } catch (err) {
      console.warn('Firestore read failed, using localStorage:', err);
    }
  }
  const responses = getMockData('studentResponses');
  return responses
    .filter((r: any) => r.teacherId === teacherId)
    .sort((a: any, b: any) => b.completedAt - a.completedAt);
}
