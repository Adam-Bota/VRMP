import { initializeApp } from "firebase/app";
import { clientConfig } from "@/config";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

export const app = initializeApp(clientConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const database = getDatabase(app);