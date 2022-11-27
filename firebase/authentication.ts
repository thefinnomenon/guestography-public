import {
  getAuth,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
  signOut,
} from "firebase/auth";
import firebase from "./firebase";

export const auth = getAuth(firebase);

const actionCodeSettings = {
  url: "https://www.guestography.net/finishLogin",
  handleCodeInApp: true,
};

export const sendEmailSignInLink = async (email: string) => {
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem("emailForSignIn", email);
  } catch (e) {
    console.log(e);
  }
};

export const verifyEmailSignInLink = async () => {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem("emailForSignIn");
    if (!email) {
      email = window.prompt("Please provide your email for confirmation") || "";
    }

    try {
      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem("emailForSignIn");
    } catch (e) {
      console.log(e);
    }
  }
};

export const logOut = () => signOut(auth);
