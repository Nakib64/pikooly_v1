// Friendly mapper for auth errors → user-facing title + actionable description.
export type FriendlyAuthError = {
  title: string;
  description: string;
};

export function mapAuthError(err: unknown): FriendlyAuthError {
  let raw = "Something went wrong";
  if (typeof err === "string" && err) {
    raw = err;
  } else if (err && typeof err === "object" && "message" in err) {
    raw = String((err as any).message);
  }
  const msg = raw.toLowerCase();

  if (msg.includes("invalid login") || msg.includes("invalid_credentials") || msg.includes("invalid credentials")) {
    return {
      title: "Wrong email or password",
      description:
        "The email or password you entered doesn't match our records. Check for typos, make sure Caps Lock is off, or use 'Forgot password' to reset it.",
    };
  }
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return {
      title: "Email not verified",
      description:
        "Please open the verification link we emailed you. Check your spam folder, or sign up again to resend the link.",
    };
  }
  if (msg.includes("user not found") || msg.includes("no user")) {
    return {
      title: "No account found",
      description: "We couldn't find an account with this email. Try signing up, or double-check the email address.",
    };
  }
  if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("over_email_send_rate")) {
    return {
      title: "Too many attempts",
      description: "You've tried too many times. Please wait a minute and try again.",
    };
  }
  if (msg.includes("password should") || msg.includes("weak_password")) {
    return {
      title: "Weak password",
      description: "Use at least 8 characters with a mix of letters and numbers.",
    };
  }
  if (msg.includes("user already") || msg.includes("already registered")) {
    return {
      title: "Account already exists",
      description: "An account with this email already exists. Try logging in or use 'Forgot password'.",
    };
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return {
      title: "Network error",
      description: "Check your internet connection and try again.",
    };
  }
  if (msg.includes("otp") && msg.includes("expired")) {
    return { title: "Code expired", description: "Your verification code has expired. Please request a new one." };
  }
  if (msg.includes("otp") || msg.includes("token")) {
    return { title: "Invalid code", description: "The code you entered isn't correct. Please request a new one and try again." };
  }

  return { title: "Login failed", description: raw };
}
