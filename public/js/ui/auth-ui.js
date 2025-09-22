import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from '../config/firebase-config.js';

export const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
    return signOut(auth);
};

export const onAuthState = (callback) => {
    return onAuthStateChanged(auth, callback);
};

export const register = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
};